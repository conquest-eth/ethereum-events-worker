import { Contract, ethers } from 'ethers';
import { getLogEvents, LogEvent } from './utils/ethereum';
import {
  createJSONResponse,
  parseGETParams,
  pathFromURL,
} from './utils/request';
import { SECONDS, sleep_then_execute, TimeoutPromise } from './utils/time';

function lexicographicNumber15(num: number): string {
  return num.toString().padStart(15, '0');
}

type ContractSetup = { reset?: boolean; list: ContractData[] };

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

type BlockEvents = { hash: string; number: number; events: LogEvent[] };

type ContractData = { eventsABI: any[]; address: string; startBlock?: number };

export abstract class EthereumEventsDO {
  static alarm: { interval?: number } | null = {};
  static scheduled: { interval: number } = { interval: 6 };

  provider: ethers.providers.JsonRpcProvider;
  contractsData: ContractData[] | undefined;
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

    // TODO only admin
    let reset = data.reset;

    if (!this.contractsData) {
      reset = true;
    } else {
      for (const contractData of data.list) {
        if (
          !this.contractsData.find(
            (v) =>
              v.address.toLowerCase() === contractData.address.toLowerCase(),
          )
        ) {
          reset = true;
        }
      }

      for (const contract of this.contractsData) {
        if (
          !data.list.find(
            (v) => v.address.toLowerCase() === contract.address.toLowerCase(),
          )
        ) {
          reset = true;
        }
      }
    }

    if (reset) {
      await this.state.storage.deleteAll();
      this.contracts = undefined;
      this.contractsData = undefined;
    }

    this.state.storage.put<ContractData[]>('_contracts_', data.list);

    console.log({ reset, numContracts: data.list.length });

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
        60,
        EthereumEventsDO.scheduled.interval,
      );
    } else {
      await this._execute_one_process();
    }
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

      if (!this.contractsData || !this.contracts) {
        return new Response('Not Ready');
      }

      const lastSync = await this._getLastSync();
      let streamID = 0;
      let fromBlock = 0;
      for (const contractData of this.contractsData) {
        if (contractData.startBlock) {
          if (fromBlock === 0) {
            fromBlock = contractData.startBlock;
          } else if (contractData.startBlock < fromBlock) {
            fromBlock = contractData.startBlock;
          }
        }
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

      let toBlock = Math.min(latestBlock, fromBlock + 100000); // TODO Config: 10,000 max block range

      if (fromBlock > toBlock) {
        console.log(`no new block yet, skip`);
        return new Response('no new block yet, skip');
      }

      const { events: newEvents, toBlock: newToBlock } = await getLogEvents(
        this.provider,
        this.contracts,
        {
          fromBlock,
          toBlock,
        },
      );
      if (newToBlock !== toBlock) {
        console.log(
          `number of block fetched was reduced by ${toBlock - newToBlock}`,
        );
        toBlock = newToBlock;
      }

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
        delete (event as any).streamID; // TODO typing
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

      return createJSONResponse({ success: true });
    } finally {
      this.processing = false;
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

  abstract onEventStream(eventStream: EventWithId[]): void;

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
        return this.processEvents();
      case 'list':
      case 'events':
        const params = parseGETParams(request.url);
        return this.getEvents(params);
      default: {
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

  async _execute_multiple_process(duration: number, interval: number) {
    for (let delay = 0; delay <= duration - interval; delay += interval) {
      this.alarmProcesses.push(
        sleep_then_execute(delay, () => this._execute_one_process()),
      );
    }

    let response: Response;
    try {
      await Promise.all(this.alarmProcesses);
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
      for (const contractData of this.contractsData) {
        this.contracts.push(
          new Contract(
            contractData.address,
            contractData.eventsABI,
            this.provider,
          ),
        );
      }
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