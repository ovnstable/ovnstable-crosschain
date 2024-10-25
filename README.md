##Roles in project:
- PORTFOLIO_AGENT_ROLE: 0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137
- UNIT_ROLE: 0xede8101501d89b9894e78e4f219420b6ddb840e8e75dde35741a0745408476d7
- DEFAULT_ADMIN_ROLE: 0x0000000000000000000000000000000000000000000000000000000000000000
- UPGRADER_ROLE: 0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3
- EXCHANGER: 0x3eb675f159e6ca6cf5de6bfbbc8c4521cfd428f5e9166e51094d5898504caf2d

DEFAULT_ADMIN_ROLE -- Responsible for managing roles within the system
UPGRADER_ROLE -- Authorized to upgrade all contracts and modify contract parameters
UNIT_ROLE -- Responsible for managing payout operations and interacting with the payout manager
PORTFOLIO_AGENT_ROLE -- Authorized to perform all portfolio-related operations and management tasks
EXCHANGER -- Handles all exchange-related operations and transactions within the system


## Table of roles:
|                  | source_admin | source_upgrader | destination_admin | destination_upgrader |
| ---------------- | ------------ | --------------- | ----------------- | -------------------- |
|remoteHub         | timelock     | hubUpgrader     | hubUpgrader       | hubUpgrader          |
|remoteHubUpgrader | timelock     | remoteHub       | remoteHub         | remoteHub            |
|exchange          | remoteHub    | remoteHub       | remoteHub         | remoteHub            |
|market            | remoteHub    | remoteHub       | remoteHub         | remoteHub            |
|roleManager       | remoteHub    | remoteHub       | remoteHub         | remoteHub            |
|xusdToken         | remoteHub    | remoteHub       | remoteHub         | remoteHub            |
|wrappedXusdToken  | remoteHub    | remoteHub       | remoteHub         | remoteHub            |
|payoutManager     | remoteHub    | remoteHub       | remoteHub         | remoteHub            |

## Logic of upgrade:

Market Sourse:
timelock --> remoteHubSource --> market.upgradeTo

RemoteHub Sourse:
timelock --> remoteHubUpgraderSource --> remoteHub.upgradeTo

RemoteHubUpgrader Sourse:
timelock --> remoteHubSource --> remoteHubUpgrader.upgradeTo

Market Dest:
timelock --> remoteHubSource --> remoteHubDestination --> market.upgradeTo

RemoteHub Dest:
timelock --> remoteHubSource --> remoteHubUpgraderDestination --> remoteHub.upgradeTo

RemoteHubUpgrader Dest:
timelock --> remoteHubSource --> remoteHubDestination --> remoteHubUpgrader.upgradeTo
