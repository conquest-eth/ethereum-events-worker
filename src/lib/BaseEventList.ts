import { BigNumber, Contract, ethers, Wallet, utils } from 'ethers'
import { DO } from './DO'
import { createResponse } from './utils'
import { getLogEvents, LogEvent } from './ethereum/utils'

function lexicographicNumber15(num: number): string {
  return num.toString().padStart(15, '0')
}

type EventBlock = {
  number: number
  hash: string
  startStreamID: number
  numEvents: number
}

type LastSync = {
  latestBlock: number
  lastToBlock: number
  unconfirmedBlocks: EventBlock[]
  nextStreamID: number
}

export type EventWithId = LogEvent & {
  streamID: number
}

type BlockEvents = { hash: string; number: number; events: LogEvent[] }

type ContractData = { eventsABI: any[]; address: string; startBlock?: number }

export abstract class BaseEventList extends DO {
  provider: ethers.providers.JsonRpcProvider
  contractsData: ContractData[] | undefined
  contracts: ethers.Contract[] | undefined
  finality: number

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    console.log(`ethereum node : ${env.ETHEREUM_NODE}`)
    this.provider = new ethers.providers.JsonRpcProvider(env.ETHEREUM_NODE)
    this.provider = new ethers.providers.StaticJsonRpcProvider({
      url: env.ETHEREUM_NODE,
      skipFetchSetup: true,
    })
    this.finality = 12 // TODO
  }

  async setup(
    path: string[],
    request: Request,
    data: { reset?: boolean; list: ContractData[] },
  ): Promise<Response> {
    await this._setupContracts()

    // TODO only admin
    let reset = data.reset

    console.log({ path, data })

    if (!this.contractsData) {
      reset = true
    } else {
      for (const contractData of data.list) {
        if (
          !this.contractsData.find(
            (v) =>
              v.address.toLowerCase() === contractData.address.toLowerCase(),
          )
        ) {
          reset = true
        }
      }

      for (const contract of this.contractsData) {
        if (
          !data.list.find(
            (v) => v.address.toLowerCase() === contract.address.toLowerCase(),
          )
        ) {
          reset = true
        }
      }
    }

    if (reset) {
      await this.state.storage.deleteAll()
      this.contracts = undefined
      this.contractsData = undefined
    }

    this.state.storage.put<ContractData[]>('_contracts_', data.list)

    console.log({ reset, numContracts: data.list.length })

    return createResponse({ success: true, reset })
  }

  _getEventsMap(
    start: number,
    limit: number,
  ): Promise<Map<string, LogEvent> | undefined> {
    return this.state.storage.list<LogEvent>({
      start: `event_${lexicographicNumber15(start)}`,
      limit,
    })
  }

  _getLastSync(): Promise<LastSync | undefined> {
    return this.state.storage.get<LastSync>(`_sync_`)
  }

  async _putLastSync(lastSync: LastSync): Promise<void> {
    await this.state.storage.put<LastSync>(`_sync_`, lastSync)
  }

  async getEvents(path: string[]): Promise<Response> {
    const start = parseInt(path[0])
    const limit = parseInt(path[1])

    const eventsMap = await this._getEventsMap(start, limit)
    const events = []
    if (eventsMap) {
      for (const entry of eventsMap.entries()) {
        const eventID = entry[0]
        const event = entry[1]
        events.push({ streamID: parseInt(eventID.slice(6)), ...event })
      }
    }

    return createResponse({ events, success: true })
  }

  async _setupContracts() {
    if (!this.contractsData) {
      this.contractsData = await this.state.storage.get<ContractData[]>(
        '_contracts_',
      )
    }

    if (!this.contracts && this.contractsData) {
      this.contracts = []
      for (const contractData of this.contractsData) {
        this.contracts.push(
          new Contract(
            contractData.address,
            contractData.eventsABI,
            this.provider,
          ),
        )
      }
    }
  }

  async processEvents(path: string[]): Promise<Response> {
    await this._setupContracts()

    if (!this.contractsData || !this.contracts) {
      return new Response('Not Ready')
    }

    const lastSync = await this._getLastSync()
    let streamID = 0
    let fromBlock = 0
    for (const contractData of this.contractsData) {
      if (contractData.startBlock) {
        if (fromBlock === 0) {
          fromBlock = contractData.startBlock
        } else if (contractData.startBlock < fromBlock) {
          fromBlock = contractData.startBlock
        }
      }
    }
    let unconfirmedBlocks: EventBlock[] = []
    if (lastSync) {
      unconfirmedBlocks = lastSync.unconfirmedBlocks
      streamID = lastSync.nextStreamID
      if (unconfirmedBlocks.length > 0) {
        fromBlock = lastSync.unconfirmedBlocks[0].number
      } else {
        fromBlock = lastSync.lastToBlock + 1
      }
    }

    const latestBlock = await this.provider.getBlockNumber()

    const toBlock = Math.min(latestBlock, fromBlock + 10000) // TODO Config: 10,000 max block range

    const newEvents = await getLogEvents(this.provider, this.contracts, {
      fromBlock,
      toBlock,
    })

    console.log({ latestBlock, toBlock, newEvents: newEvents.length })

    // grouping per block...
    const groups: { [hash: string]: BlockEvents } = {}
    const eventsGroupedPerBlock: BlockEvents[] = []
    for (const event of newEvents) {
      let group = groups[event.blockHash]
      if (!group) {
        group = groups[event.blockHash] = {
          hash: event.blockHash,
          number: event.blockNumber,
          events: [],
        }
        eventsGroupedPerBlock.push(group)
      }
      group.events.push(event)
    }

    // set up the new entries to be added to the stream
    // const newEventEntries: DurableObjectEntries<LogEvent> = {};
    const eventStream: EventWithId[] = []

    // find reorgs
    let reorgBlock: EventBlock | undefined
    let currentIndex = 0
    for (const block of eventsGroupedPerBlock) {
      if (currentIndex < unconfirmedBlocks.length) {
        const unconfirmedBlockAtIndex = unconfirmedBlocks[currentIndex]
        if (unconfirmedBlockAtIndex.hash !== block.hash) {
          reorgBlock = unconfirmedBlockAtIndex
          break
        }
        currentIndex++
      }
    }

    if (reorgBlock) {
      // re-add event to the stream but flag them as removed
      const lastUnconfirmedBlock =
        unconfirmedBlocks[unconfirmedBlocks.length - 1]
      const unconfirmedEventsMap = await this._getEventsMap(
        reorgBlock.startStreamID,
        lastUnconfirmedBlock.startStreamID + lastUnconfirmedBlock.numEvents,
      )
      if (unconfirmedEventsMap) {
        for (const entry of unconfirmedEventsMap.entries()) {
          const event = entry[1]
          // newEventEntries[`${streamID++}`] = {...event, removed: true};
          eventStream.push({ streamID: streamID++, ...event, removed: true })
        }
      }
    }

    const startingBlockForNewEvent = reorgBlock
      ? reorgBlock.number
      : unconfirmedBlocks.length > 0
      ? unconfirmedBlocks[unconfirmedBlocks.length - 1].number + 1
      : eventsGroupedPerBlock.length > 0
      ? eventsGroupedPerBlock[0].number
      : 0 // was undefined // TODO undefined ?

    // new events and new unconfirmed blocks
    const newUnconfirmedBlocks: EventBlock[] = []
    for (const block of eventsGroupedPerBlock) {
      if (block.events.length > 0 && block.number >= startingBlockForNewEvent) {
        const startStreamID = streamID
        for (const event of block.events) {
          // newEventEntries[`${streamID++}`] = {...event};
          eventStream.push({ streamID: streamID++, ...event })
        }
        if (latestBlock - block.number <= this.finality) {
          newUnconfirmedBlocks.push({
            hash: block.hash,
            number: block.number,
            numEvents: block.events.length,
            startStreamID,
          })
        }
      }
    }

    let entriesInGroupOf128: Record<string, LogEvent> = {}
    let counter = 0
    for (const event of eventStream) {
      entriesInGroupOf128[`event_${lexicographicNumber15(event.streamID)}`] =
        event
      delete (event as any).streamID // TODO typing
      counter++
      if (counter == 128) {
        this.state.storage.put<LogEvent>(entriesInGroupOf128)
        entriesInGroupOf128 = {}
        counter = 0
      }
    }
    if (counter > 0) {
      this.state.storage.put<LogEvent>(entriesInGroupOf128)
    }

    this._putLastSync({
      latestBlock,
      lastToBlock: toBlock,
      unconfirmedBlocks: newUnconfirmedBlocks,
      nextStreamID: streamID,
    })

    this.onEventStream(eventStream)

    return createResponse({ success: true })
  }

  abstract onEventStream(eventStream: EventWithId[]): void
}