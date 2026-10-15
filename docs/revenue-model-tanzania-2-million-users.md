# Revenue model for 2 million portal users

## Purpose and limits

This briefing estimates possible annual collections if 2 million people use the Mtaani-Kiganjani portal. It uses the fee values and percentage rules currently configured in the application code. These figures are planning scenarios, not an official government tariff, a revenue forecast, or a legal opinion.

Two million accounts do not mean two million paid applications. Revenue depends on how many people apply, which services they use, the applicant category, the approved tariff, and successful payment collection.

## Fees currently configured in the portal

| Service | Tanzanian citizen | Diaspora | Foreigner |
| --- | ---: | ---: | ---: |
| Burial permit | TSh 2,000 | TSh 10,000 | TSh 20,000 |
| Celebration permit | 5% of declared event cost | 10% of declared event cost | 10% of declared event cost |
| Introduction letter | TSh 2,000 | TSh 10,000 | TSh 10,000 |
| Dispute report | TSh 1,000 | TSh 20,000 | TSh 10,000 |

For a celebration with a declared cost of TSh 100,000, the configured charge is TSh 5,000 for a citizen and TSh 10,000 for a diaspora applicant or foreigner. The event cost is the calculation base; it is not added to the amount due.

These values are read from `src/constants/serviceFees.ts`. The portal also contains a provisional fee split in `splitFee`: 20% TRA, 10% Halmashauri, 40% Maendeleo ya Jamii, and 30% Service Fee. That split is a software configuration only. It must not be presented as an approved government allocation until the responsible public authorities approve the fee schedule, payees, and accounting treatment.

## Illustrative 2 million user scenarios

### Assumptions

- The 2 million are registered users for a one-year period.
- Each participating user submits one paid application during that year.
- The application mix is 40% introduction letters, 25% burial permits, 25% dispute reports, and 10% celebration permits.
- For this example, applicants are citizens and the average declared celebration cost is TSh 100,000. The celebration fee is therefore TSh 5,000.
- At those assumptions, the average fee per application is TSh 2,050.
- 90% of billed applications complete payment. Amounts exclude payment-provider charges, refunds, waived fees, taxes (if separately applicable), and operating costs.

Calculation: `registered users × service uptake × one application per participating user × TSh 2,050 average fee × 90% payment completion`.

| Annual service uptake | Applications billed | Gross billed | Estimated cash collected at 90% |
| ---: | ---: | ---: | ---: |
| 10% | 200,000 | TSh 410,000,000 | TSh 369,000,000 |
| 25% | 500,000 | TSh 1,025,000,000 | TSh 922,500,000 |
| 50% | 1,000,000 | TSh 2,050,000,000 | TSh 1,845,000,000 |
| 100% | 2,000,000 | TSh 4,100,000,000 | TSh 3,690,000,000 |

The 100% row is a mathematical ceiling for this one-application assumption, not a realistic forecast. Repeat applications can increase collections; lower uptake, payment failure, waivers, or a different service mix can reduce them. A diaspora/foreigner mix or higher average event costs can also materially change the average fee.

### Example of the provisional code split

If the 25% uptake case collected TSh 922,500,000, applying the current software split would show:

| Current code label | Configured share | Illustrative amount |
| --- | ---: | ---: |
| TRA | 20% | TSh 184,500,000 |
| Halmashauri | 10% | TSh 92,250,000 |
| Maendeleo ya Jamii | 40% | TSh 369,000,000 |
| Service Fee | 30% | TSh 276,750,000 |
| **Total** | **100%** | **TSh 922,500,000** |

This table demonstrates the arithmetic of the current software setting only. It does not establish that TRA is entitled to 20%, that these are the correct receiving accounts, or that the 30% Service Fee is government revenue. Government finance officers must define and approve the actual allocation before launch.

## How collections should reach public accounts

1. **Approve each fee first.** The responsible ministry, council, or other authority should confirm which body may charge for each service, the legal authority, amount or percentage, exemptions, and any required by-law or official notice. The Local Government Finances Act sets out sources and management of local-government revenue and includes revenue from permits, licences, charges, or fees specified by council by-laws. See the [Office of the Solicitor General’s Local Government Finances Act, Cap. 290 R.E. 2023](https://elibrary.osg.go.tz/items/4dea0d28-c0e1-47d3-ac1d-32eaa0c7eddf).
2. **Publish the approved tariff.** Display the fee, calculation base, applicant categories, exemptions, and responsible receiving institution before the applicant submits. Tanzania’s Government Service Directory describes making service procedures, costs, and requirements available to the public: [Tanzania Government Service Directory](https://tgsd.edodoso.gov.go.tz/AboutLanding).
3. **Issue an official bill or control number.** Connect the portal to the government’s approved collection process so each fee is traceable to the service, council or institution, applicant, and vote/account. The e-Government Agency describes GePG as the government electronic payment gateway for public revenue collection: [e-GA ERMS and GePG overview](https://erms.gov.go.tz/index.html).
4. **Reconcile payment before issuing documents.** Match gateway confirmations to the control number, write a receipt and audit event, and only then mark an application paid. Keep failed, pending, reversed, waived, and refunded transactions distinct from collected revenue.
5. **Post funds to approved accounts and report them.** The receiving public entity should reconcile collections to its official accounting records, report by service and location, and use funds through the approved budget and public-finance process. The software’s percentage labels should not move or earmark public funds on their own.

## What must be confirmed before presenting this as government revenue

- The competent government body and the legal authority for each charge.
- Approved tariffs, including the 5%/10% celebration formula and the declared event-cost basis.
- Whether citizen, diaspora, and foreigner differences are permitted and approved.
- The legal allocation of each collected shilling and the treatment of payment-provider costs.
- The receiving institution/account and integration path for GePG or another authorized government gateway.
- Receipt format, audit retention, reconciliation responsibilities, refunds, exemptions, and oversight.
- Whether collected amounts are fees/charges, taxes, or another revenue category. They should not be described as TRA tax revenue merely because a software field is labelled “TRA.”

## Source notes

- Portal fee values and percentage rules: `src/constants/serviceFees.ts`.
- Current provisional fee split: `splitFee()` in `src/constants/serviceFees.ts`.
- Tanzania’s Government Service Directory describes public service procedures, costs, and requirements: [TGSD](https://tgsd.edodoso.gov.tz/AboutLanding).
- The Office of the Solicitor General provides the Local Government Finances Act, Cap. 290 R.E. 2023: [official legislation entry](https://elibrary.osg.go.tz/items/4dea0d28-c0e1-47d3-ac1d-32eaa0c7eddf).
- e-GA describes GePG’s role in electronic government revenue collection: [ERMS / GePG overview](https://erms.gov.go.tz/index.html).
