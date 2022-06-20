import 'isomorphic-fetch';

async function main() {
  await fetch('http://localhost:8787/events/setup', {
    method: 'POST',
    body: JSON.stringify({
      list: [
        {
          startBlock: 5977167,
          eventsABI: [
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'previousOwner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'newOwner',
                  type: 'address',
                },
              ],
              name: 'OwnershipTransferred',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'previousImplementation',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'newImplementation',
                  type: 'address',
                },
              ],
              name: 'ProxyImplementationUpdated',
              type: 'event',
            },
            {
              stateMutability: 'payable',
              type: 'fallback',
            },
            {
              inputs: [],
              name: 'owner',
              outputs: [
                {
                  internalType: 'address',
                  name: '',
                  type: 'address',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'bytes4',
                  name: 'id',
                  type: 'bytes4',
                },
              ],
              name: 'supportsInterface',
              outputs: [
                {
                  internalType: 'bool',
                  name: '',
                  type: 'bool',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'newOwner',
                  type: 'address',
                },
              ],
              name: 'transferOwnership',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'newImplementation',
                  type: 'address',
                },
              ],
              name: 'upgradeTo',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'newImplementation',
                  type: 'address',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
              ],
              name: 'upgradeToAndCall',
              outputs: [],
              stateMutability: 'payable',
              type: 'function',
            },
            {
              stateMutability: 'payable',
              type: 'receive',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'operator',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'bool',
                  name: 'approved',
                  type: 'bool',
                },
              ],
              name: 'ApprovalForAll',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'stake',
                  type: 'uint256',
                },
              ],
              name: 'ExitComplete',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'fleet',
                  type: 'uint256',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'fleetOwner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'destinationOwner',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'destination',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'bool',
                  name: 'gift',
                  type: 'bool',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'fleetLoss',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'planetLoss',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'inFlightFleetLoss',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'inFlightPlanetLoss',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'bool',
                  name: 'won',
                  type: 'bool',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'newNumspaceships',
                  type: 'uint32',
                },
              ],
              name: 'FleetArrived',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'fleetSender',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'fleetOwner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'from',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'operator',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'fleet',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'quantity',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'newNumSpaceships',
                  type: 'uint32',
                },
              ],
              name: 'FleetSent',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'minX',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'maxX',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'minY',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'maxY',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'bytes32',
                  name: 'genesis',
                  type: 'bytes32',
                },
              ],
              name: 'Initialized',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
              ],
              name: 'PlanetExit',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
              ],
              name: 'PlanetReset',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'acquirer',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint32',
                  name: 'numSpaceships',
                  type: 'uint32',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'stake',
                  type: 'uint256',
                },
              ],
              name: 'PlanetStake',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'giver',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'rewardId',
                  type: 'uint256',
                },
              ],
              name: 'RewardSetup',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  indexed: true,
                  internalType: 'uint256',
                  name: 'rewardId',
                  type: 'uint256',
                },
              ],
              name: 'RewardToWithdraw',
              type: 'event',
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'newStake',
                  type: 'uint256',
                },
              ],
              name: 'StakeToWithdraw',
              type: 'event',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'acquireViaTransferFrom',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'sponsor',
                  type: 'address',
                },
              ],
              name: 'addReward',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [],
              name: 'allianceRegistry',
              outputs: [
                {
                  internalType: 'contract AllianceRegistry',
                  name: '',
                  type: 'address',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
              ],
              name: 'balanceToWithdraw',
              outputs: [
                {
                  internalType: 'uint256',
                  name: '',
                  type: 'uint256',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
              ],
              name: 'exitFor',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'uint256[]',
                  name: 'locations',
                  type: 'uint256[]',
                },
              ],
              name: 'fetchAndWithdrawFor',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [],
              name: 'getDiscovered',
              outputs: [
                {
                  components: [
                    {
                      internalType: 'uint32',
                      name: 'minX',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'maxX',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'minY',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'maxY',
                      type: 'uint32',
                    },
                  ],
                  internalType: 'struct OuterSpace.Discovered',
                  name: '',
                  type: 'tuple',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'fleetId',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'from',
                  type: 'uint256',
                },
              ],
              name: 'getFleet',
              outputs: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  internalType: 'uint32',
                  name: 'launchTime',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: 'quantity',
                  type: 'uint32',
                },
                {
                  internalType: 'uint64',
                  name: 'flyingAtLaunch',
                  type: 'uint64',
                },
                {
                  internalType: 'uint64',
                  name: 'destroyedAtLaunch',
                  type: 'uint64',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [],
              name: 'getGeneisHash',
              outputs: [
                {
                  internalType: 'bytes32',
                  name: '',
                  type: 'bytes32',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
              ],
              name: 'getPlanet',
              outputs: [
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'owner',
                      type: 'address',
                    },
                    {
                      internalType: 'uint32',
                      name: 'exitTime',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'numSpaceships',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'lastUpdated',
                      type: 'uint32',
                    },
                    {
                      internalType: 'bool',
                      name: 'active',
                      type: 'bool',
                    },
                    {
                      internalType: 'uint256',
                      name: 'reward',
                      type: 'uint256',
                    },
                  ],
                  internalType: 'struct OuterSpace.ExternalPlanet',
                  name: 'state',
                  type: 'tuple',
                },
                {
                  components: [
                    {
                      internalType: 'int8',
                      name: 'subX',
                      type: 'int8',
                    },
                    {
                      internalType: 'int8',
                      name: 'subY',
                      type: 'int8',
                    },
                    {
                      internalType: 'uint16',
                      name: 'stake',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'production',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'attack',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'defense',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'speed',
                      type: 'uint16',
                    },
                    {
                      internalType: 'uint16',
                      name: 'natives',
                      type: 'uint16',
                    },
                  ],
                  internalType: 'struct OuterSpace.PlanetStats',
                  name: 'stats',
                  type: 'tuple',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256[]',
                  name: 'locations',
                  type: 'uint256[]',
                },
              ],
              name: 'getPlanetStates',
              outputs: [
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'owner',
                      type: 'address',
                    },
                    {
                      internalType: 'uint32',
                      name: 'exitTime',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'numSpaceships',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'lastUpdated',
                      type: 'uint32',
                    },
                    {
                      internalType: 'bool',
                      name: 'active',
                      type: 'bool',
                    },
                    {
                      internalType: 'uint256',
                      name: 'reward',
                      type: 'uint256',
                    },
                  ],
                  internalType: 'struct OuterSpace.ExternalPlanet[]',
                  name: 'planetStates',
                  type: 'tuple[]',
                },
                {
                  components: [
                    {
                      internalType: 'uint32',
                      name: 'minX',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'maxX',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'minY',
                      type: 'uint32',
                    },
                    {
                      internalType: 'uint32',
                      name: 'maxY',
                      type: 'uint32',
                    },
                  ],
                  internalType: 'struct OuterSpace.Discovered',
                  name: 'discovered',
                  type: 'tuple',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: '',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'forAddress',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
              ],
              name: 'onTokenPaidFor',
              outputs: [
                {
                  internalType: 'bool',
                  name: '',
                  type: 'bool',
                },
              ],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: '',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
              ],
              name: 'onTokenTransfer',
              outputs: [
                {
                  internalType: 'bool',
                  name: '',
                  type: 'bool',
                },
              ],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'contract IERC20',
                  name: '',
                  type: 'address',
                },
                {
                  internalType: 'contract AllianceRegistry',
                  name: '',
                  type: 'address',
                },
                {
                  internalType: 'bytes32',
                  name: 'genesis',
                  type: 'bytes32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
                {
                  internalType: 'uint32',
                  name: '',
                  type: 'uint32',
                },
              ],
              name: 'postUpgrade',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'location',
                  type: 'uint256',
                },
              ],
              name: 'resetPlanet',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'fleetId',
                  type: 'uint256',
                },
                {
                  components: [
                    {
                      internalType: 'uint256',
                      name: 'from',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'to',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint256',
                      name: 'distance',
                      type: 'uint256',
                    },
                    {
                      internalType: 'bool',
                      name: 'gift',
                      type: 'bool',
                    },
                    {
                      internalType: 'address',
                      name: 'specific',
                      type: 'address',
                    },
                    {
                      internalType: 'bytes32',
                      name: 'secret',
                      type: 'bytes32',
                    },
                    {
                      internalType: 'address',
                      name: 'fleetSender',
                      type: 'address',
                    },
                    {
                      internalType: 'address',
                      name: 'operator',
                      type: 'address',
                    },
                  ],
                  internalType: 'struct OuterSpace.FleetResolution',
                  name: 'resolution',
                  type: 'tuple',
                },
              ],
              name: 'resolveFleet',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'uint256',
                  name: 'from',
                  type: 'uint256',
                },
                {
                  internalType: 'uint32',
                  name: 'quantity',
                  type: 'uint32',
                },
                {
                  internalType: 'bytes32',
                  name: 'toHash',
                  type: 'bytes32',
                },
              ],
              name: 'send',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  components: [
                    {
                      internalType: 'address',
                      name: 'fleetSender',
                      type: 'address',
                    },
                    {
                      internalType: 'address',
                      name: 'fleetOwner',
                      type: 'address',
                    },
                    {
                      internalType: 'uint256',
                      name: 'from',
                      type: 'uint256',
                    },
                    {
                      internalType: 'uint32',
                      name: 'quantity',
                      type: 'uint32',
                    },
                    {
                      internalType: 'bytes32',
                      name: 'toHash',
                      type: 'bytes32',
                    },
                  ],
                  internalType: 'struct OuterSpace.FleetLaunch',
                  name: 'launch',
                  type: 'tuple',
                },
              ],
              name: 'sendFor',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'operator',
                  type: 'address',
                },
                {
                  internalType: 'bool',
                  name: 'approved',
                  type: 'bool',
                },
              ],
              name: 'setApprovalForAll',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
              ],
              name: 'withdrawFor',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'implementationAddress',
                  type: 'address',
                },
                {
                  internalType: 'address',
                  name: 'ownerAddress',
                  type: 'address',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
              ],
              stateMutability: 'payable',
              type: 'constructor',
            },
          ],
          address: '0x377606c34Ae6458d55ba04253ae815C9c48A9A73',
        },
      ],
    }),
  });
}

main();
