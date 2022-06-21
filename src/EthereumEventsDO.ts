import { Contract, ethers } from 'ethers';
import { LogEventFetcher, LogEvent } from './utils/ethereum';
import {
  createJSONResponse,
  parseGETParams,
  pathFromURL,
} from './utils/request';
import { SECONDS, sleep_then_execute, TimeoutPromise } from './utils/time';

function lexicographicNumber15(num: number): string {
  return num.toString().padStart(15, '0');
}

type ContractSetup = {
  reset?: boolean;
  list?: ContractData[];
  all?: ContractData;
};

type EventBlock = {
  number: number;
  hash: string;
  startStreamID: number;
  numEvents: number;
};

type LastSync = {
  latestBlock: number;
  lastToBlock: number;
  unconfirmedBlocks: EventBlock[];
  nextStreamID: number;
};

export type EventWithId = LogEvent & {
  streamID: number;
};

export { LogEvent } from './utils/ethereum';

type BlockEvents = { hash: string; number: number; events: LogEvent[] };

type ContractData = { eventsABI: any[]; address: string; startBlock?: number };

type AllContractData = { eventsABI: any[]; startBlock?: number };

export abstract class EthereumEventsDO {
  static alarm: { interval?: number } | null = {};
  static scheduled: { interval: number } = { interval: 0 };

  logEventFetcher: LogEventFetcher | undefined;
  provider: ethers.providers.JsonRpcProvider;
  contractsData: ContractData[] | AllContractData | undefined;
  contracts: ethers.Contract[] | undefined;
  finality: number;

  /// requires ETHEREUM_NODE
  constructor(protected state: DurableObjectState, protected env: Env) {
    // super(state, env);
    console.log(`ethereum node : ${env.ETHEREUM_NODE}`);
    this.provider = new ethers.providers.JsonRpcProvider(env.ETHEREUM_NODE);
    this.provider = new ethers.providers.StaticJsonRpcProvider({
      url: env.ETHEREUM_NODE,
      skipFetchSetup: true,
    });
    this.finality = 12; // TODO
  }

  async setup(data: ContractSetup) {
    await this._setupContracts();

    if (data.list && data.all) {
      throw new Error(`invalid contract data, use list OR all, ot both`);
    }
    if (!data.list && !data.all) {
      throw new Error(`invalid contract data, need list or all`);
    }

    // TODO only admin
    let reset = data.reset;

    if (!this.contractsData) {
      reset = true;
    } else {
      if (data.list) {
        if (!Array.isArray(this.contractsData)) {
          reset = true;
        } else {
          for (const contractData of data.list) {
            if (
              !this.contractsData.find(
                (v) =>
                  v.address.toLowerCase() ===
                  contractData.address.toLowerCase(),
              )
            ) {
              reset = true;
            }
          }

          for (const contract of this.contractsData) {
            if (
              !data.list.find(
                (v) =>
                  v.address.toLowerCase() === contract.address.toLowerCase(),
              )
            ) {
              reset = true;
            }
          }
        }
      } else if (data.all) {
        if (Array.isArray(this.contractsData)) {
          reset = true;
        } else {
          reset = false; // TODO allow reset ?
          // this also applies to list if only eventABI changes
        }
      }
    }

    if (reset) {
      await this.state.storage.deleteAll();
      this.contracts = undefined;
      this.contractsData = undefined;
    }

    this.state.storage.put<ContractData[] | AllContractData>(
      '_contracts_',
      data.list !== undefined
        ? (data.list as ContractData[])
        : (data.all as AllContractData),
    );

    console.log({ reset, numContracts: data.list ? data.list.length : ' all' });

    // if (EthereumEventsDO.alarm) {
    //   this.state.storage.setAlarm(Date.now() + 1 * SECONDS);
    // }
    this.alarm();

    return createJSONResponse({ success: true, reset });
  }

  async triggerAlarm() {
    if (EthereumEventsDO.alarm) {
      // let currentAlarm = await this.state.storage.getAlarm();
      // if (currentAlarm == null) {
      //   this.state.storage.setAlarm(Date.now() + 1 * SECONDS);
      // }
      this.alarm();
    }
  }

  processes: TimeoutPromise<any>[] = [];
  async process() {
    if (this.processes.length > 0) {
      for (const process of this.processes) {
        if (process.reject) {
          process.reject();
        }
      }
      this.processes = [];
    }
    const timestampInMilliseconds = Date.now();
    if (EthereumEventsDO.scheduled.interval) {
      console.log(`PROCESS ${timestampInMilliseconds}`);

      console.log(
        `multiple processes : ${EthereumEventsDO.scheduled.interval}`,
      );
      // 60 is the minimum cron interval
      await this._execute_multiple_process(
        this.processes,
        60,
        EthereumEventsDO.scheduled.interval,
      );
    } else {
      await this._execute_one_process();
    }

    return new Response(`processed`);
  }

  processing = false;
  async processEvents(): Promise<Response> {
    if (this.processing) {
      console.log(`still processing... skipping...`);
      return new Response('processing');
    }
    this.processing = true;
    try {
      await this._setupContracts();

      if (!this.contractsData || !this.contracts || !this.logEventFetcher) {
        this.processing = false;
        return new Response('Not Ready');
      }

      const lastSync = await this._getLastSync();
      let streamID = 0;
      let fromBlock = 0;
      if (Array.isArray(this.contractsData)) {
        for (const contractData of this.contractsData) {
          if (contractData.startBlock) {
            if (fromBlock === 0) {
              fromBlock = contractData.startBlock;
            } else if (contractData.startBlock < fromBlock) {
              fromBlock = contractData.startBlock;
            }
          }
        }
      } else {
        fromBlock = this.contractsData.startBlock || 0;
      }

      let unconfirmedBlocks: EventBlock[] = [];
      if (lastSync) {
        unconfirmedBlocks = lastSync.unconfirmedBlocks;
        streamID = lastSync.nextStreamID;
        if (unconfirmedBlocks.length > 0) {
          fromBlock = lastSync.unconfirmedBlocks[0].number;
        } else {
          fromBlock = lastSync.lastToBlock + 1;
        }
      }

      const latestBlock = await this.provider.getBlockNumber();

      let toBlock = latestBlock;

      if (fromBlock > toBlock) {
        console.log(`no new block yet, skip`);
        this.processing = false;
        return new Response('no new block yet, skip');
      }

      console.log(`fetching...`);
      const { events: eventsFetched, toBlockUsed: newToBlock } =
        await this.logEventFetcher.getLogEvents({
          fromBlock,
          toBlock: toBlock,
        });
      toBlock = newToBlock;

      const newEvents = await this.filter(eventsFetched);

      console.log({
        latestBlock,
        fromBlock,
        toBlock,
        newEvents: newEvents.length,
      });

      // grouping per block...
      const groups: { [hash: string]: BlockEvents } = {};
      const eventsGroupedPerBlock: BlockEvents[] = [];
      for (const event of newEvents) {
        let group = groups[event.blockHash];
        if (!group) {
          group = groups[event.blockHash] = {
            hash: event.blockHash,
            number: event.blockNumber,
            events: [],
          };
          eventsGroupedPerBlock.push(group);
        }
        group.events.push(event);
      }

      // set up the new entries to be added to the stream
      // const newEventEntries: DurableObjectEntries<LogEvent> = {};
      const eventStream: EventWithId[] = [];

      // find reorgs
      let reorgBlock: EventBlock | undefined;
      let currentIndex = 0;
      for (const block of eventsGroupedPerBlock) {
        if (currentIndex < unconfirmedBlocks.length) {
          const unconfirmedBlockAtIndex = unconfirmedBlocks[currentIndex];
          if (unconfirmedBlockAtIndex.hash !== block.hash) {
            reorgBlock = unconfirmedBlockAtIndex;
            break;
          }
          currentIndex++;
        }
      }

      if (reorgBlock) {
        // re-add event to the stream but flag them as removed
        const lastUnconfirmedBlock =
          unconfirmedBlocks[unconfirmedBlocks.length - 1];
        const unconfirmedEventsMap = await this._getEventsMap(
          reorgBlock.startStreamID,
          lastUnconfirmedBlock.startStreamID + lastUnconfirmedBlock.numEvents,
        );
        if (unconfirmedEventsMap) {
          for (const entry of unconfirmedEventsMap.entries()) {
            const event = entry[1];
            // newEventEntries[`${streamID++}`] = {...event, removed: true};
            eventStream.push({ streamID: streamID++, ...event, removed: true });
          }
        }
      }

      const startingBlockForNewEvent = reorgBlock
        ? reorgBlock.number
        : unconfirmedBlocks.length > 0
        ? unconfirmedBlocks[unconfirmedBlocks.length - 1].number + 1
        : eventsGroupedPerBlock.length > 0
        ? eventsGroupedPerBlock[0].number
        : 0; // was undefined // TODO undefined ?

      // new events and new unconfirmed blocks
      const newUnconfirmedBlocks: EventBlock[] = [];
      for (const block of eventsGroupedPerBlock) {
        if (
          block.events.length > 0 &&
          block.number >= startingBlockForNewEvent
        ) {
          const startStreamID = streamID;
          for (const event of block.events) {
            // newEventEntries[`${streamID++}`] = {...event};
            eventStream.push({ streamID: streamID++, ...event });
          }
          if (latestBlock - block.number <= this.finality) {
            newUnconfirmedBlocks.push({
              hash: block.hash,
              number: block.number,
              numEvents: block.events.length,
              startStreamID,
            });
          }
        }
      }

      let entriesInGroupOf128: Record<string, LogEvent> = {};
      let counter = 0;
      for (const event of eventStream) {
        entriesInGroupOf128[`event_${lexicographicNumber15(event.streamID)}`] =
          event;
        // TODO remove streamID to not waste space ?
        counter++;
        if (counter == 128) {
          this.state.storage.put<LogEvent>(entriesInGroupOf128);
          entriesInGroupOf128 = {};
          counter = 0;
        }
      }
      if (counter > 0) {
        this.state.storage.put<LogEvent>(entriesInGroupOf128);
      }

      this._putLastSync({
        latestBlock,
        lastToBlock: toBlock,
        unconfirmedBlocks: newUnconfirmedBlocks,
        nextStreamID: streamID,
      });

      this.onEventStream(eventStream);

      this.processing = false;
      return createJSONResponse({ success: true });
    } catch (e) {
      this.processing = false;
      return new Response(e as any);
    }
  }

  async getEvents({
    start,
    limit,
  }: {
    start?: number;
    limit?: number;
  }): Promise<Response> {
    if (!start) {
      start = 0;
    }
    if (!limit) {
      limit = 1000; // TODO ?
    }
    const eventsMap = await this._getEventsMap(start, limit);
    const events = [];
    if (eventsMap) {
      for (const entry of eventsMap.entries()) {
        const eventID = entry[0];
        const event = entry[1];
        events.push({ streamID: parseInt(eventID.slice(6)), ...event });
      }
    }

    return createJSONResponse({ events, success: true });
  }

  protected abstract onEventStream(eventStream: EventWithId[]): void;

  protected async filter(eventsFetched: LogEvent[]): Promise<LogEvent[]> {
    return eventsFetched;
  }

  async getStatus(): Promise<Response> {
    const lastSync = (await this._getLastSync()) || null;

    return createJSONResponse({ status: { lastSync }, success: true });
  }

  // --------------------------------------------------------------------------
  // ENTRY POINTS
  // --------------------------------------------------------------------------

  async fetch(request: Request) {
    const { patharray } = pathFromURL(request.url);
    let json;
    if (request.method == 'POST' || request.method == 'PUT') {
      try {
        json = await request.json();
      } catch (e) {
        json = undefined;
      }
    }
    // take the last path so that user can choose their prefix
    switch (patharray[patharray.length - 1]) {
      case 'setup':
        return this.setup(json as ContractSetup);
      case 'process':
        return this.process();
      case 'list':
      case 'events':
        const params = parseGETParams(request.url);
        return this.getEvents(params);
      case 'status':
        return this.getStatus();
      default: {
        console.log({ patharray, pathname: new URL(request.url).pathname });
        return new Response('Not found', { status: 404 });
      }
    }
  }

  alarmProcesses: TimeoutPromise<any>[] = [];
  async alarm() {
    if (this.alarmProcesses.length > 0) {
      for (const process of this.alarmProcesses) {
        if (process.reject) {
          process.reject();
        }
      }
      this.alarmProcesses = [];
    }
    const timestampInMilliseconds = Date.now();
    if (EthereumEventsDO.alarm) {
      console.log(`ALARM ${timestampInMilliseconds}`);

      if (EthereumEventsDO.alarm && EthereumEventsDO.alarm.interval) {
        console.log(`multiple processes : ${EthereumEventsDO.alarm.interval}`);
        // 30 is the minimum alarm interval
        await this._execute_multiple_process(
          this.alarmProcesses,
          30,
          EthereumEventsDO.alarm.interval,
        );
        this.state.storage.setAlarm(
          Date.now() + EthereumEventsDO.alarm.interval * SECONDS,
        );
      } else {
        await this._execute_one_process();
        // unfortunately, the minimum alarm interval is 30 seconds
        this.state.storage.setAlarm(timestampInMilliseconds + 1 * SECONDS);
      }
    }
  }

  async _execute_one_process(): Promise<Response> {
    let response: Response | undefined;
    try {
      console.log(`processing...`);
      response = await this.processEvents();
    } catch (err) {
      console.error(err);
      response = new Response(err as any);
    }
    return response;
  }

  async _execute_multiple_process(
    processes: TimeoutPromise<Response>[],
    duration: number,
    interval: number,
  ) {
    for (let delay = 0; delay <= duration - interval; delay += interval) {
      processes.push(
        sleep_then_execute(delay, () => this._execute_one_process()),
      );
    }

    let response: Response;
    try {
      await Promise.all(processes);
      response = new Response('OK');
    } catch (err) {
      console.error(err);
      response = new Response(err as any);
    }
    return response;
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  async _setupContracts() {
    if (!this.contractsData) {
      this.contractsData = await this.state.storage.get<ContractData[]>(
        '_contracts_',
      );
    }

    if (!this.contracts && this.contractsData) {
      this.contracts = [];
      if (Array.isArray(this.contractsData)) {
        for (const contractData of this.contractsData) {
          this.contracts.push(
            new Contract(
              contractData.address,
              contractData.eventsABI,
              this.provider,
            ),
          );
        }
      } else {
        // special case to fetch every event across all contracts
        // specify only one contract with address == address(0)
        const contract = new Contract(
          '0x0000000000000000000000000000000000000000',
          this.contractsData.eventsABI,
        );
        this.contracts.push(contract);
      }

      this.logEventFetcher = new LogEventFetcher(this.provider, this.contracts);
    }
  }

  _getEventsMap(
    start: number,
    limit: number,
  ): Promise<Map<string, LogEvent> | undefined> {
    return this.state.storage.list<LogEvent>({
      start: `event_${lexicographicNumber15(start)}`,
      limit,
    });
  }

  _getLastSync(): Promise<LastSync | undefined> {
    return this.state.storage.get<LastSync>(`_sync_`);
  }

  async _putLastSync(lastSync: LastSync): Promise<void> {
    await this.state.storage.put<LastSync>(`_sync_`, lastSync);
  }
}
