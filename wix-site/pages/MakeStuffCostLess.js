// "Make Stuff Cost Less" — affordability-focused issue grid.
//
// EDITOR SETUP:
//   #affordIntro        body text under the page title
//   #affordRepeater     responsive grid of cards
//      inside each item: #affordIcon, #affordTitle, #affordSummary,
//                        #affordReadMore (link button)
//   #affordJoinBtn      Carolina-blue button, "JOIN THE TEAM"

import wixLocation from 'wix-location';
import { IDS } from 'public/constants.js';
import { reveal, whenInView } from 'public/animations.js';

const INTRO =
    'Working families are paying more for less. The campaign’s plan to make ' +
    'stuff cost less — groceries, prescriptions, housing, and energy — is built ' +
    'on what works, not what polls.';

const TOPICS = [
    { _id: 'a1', title: 'Groceries',
      summary: 'Crack down on price gouging and corporate concentration so a trip to the store doesn’t blow the budget.',
      anchor: 'groceries' },
    { _id: 'a2', title: 'Prescription Drugs',
      summary: 'Cap the cost of insulin and inhalers, and let the state negotiate prices for the medicines families rely on.',
      anchor: 'prescriptions' },
    { _id: 'a3', title: 'Housing',
      summary: 'Build more homes near where people work, expand first-time buyer help, and stop predatory landlord practices.',
      anchor: 'housing' },
    { _id: 'a4', title: 'Energy & Utilities',
      summary: 'Hold monopoly utilities accountable and cut bills with weatherization, rooftop solar, and a modern grid.',
      anchor: 'energy' },
    { _id: 'a5', title: 'Child Care',
      summary: 'Make quality child care affordable so parents can work — and providers can actually pay their staff.',
      anchor: 'childcare' },
    { _id: 'a6', title: 'Health Care',
      summary: 'Defend Medicaid expansion, lower premiums on the marketplace, and protect rural hospitals.',
      anchor: 'health' }
];

$w.onReady(() => {
    const intro = $w(IDS.affordability.intro);
    if (intro) intro.text = INTRO;

    wireGrid();
    wireJoin();
    animate();
});

function wireGrid() {
    const repeater = $w(IDS.affordability.repeater);
    if (!repeater) return;
    repeater.data = TOPICS;
    repeater.onItemReady(($item, data) => {
        $item('#affordTitle').text   = data.title;
        $item('#affordSummary').text = data.summary;
        const more = $item('#affordReadMore');
        if (more) {
            more.label = 'Read the plan';
            more.onClick(() => wixLocation.to(`/make-stuff-cost-less#${data.anchor}`));
        }
    });
}

function wireJoin() {
    const btn = $w(IDS.affordability.ctaJoin);
    if (!btn) return;
    btn.label = 'JOIN THE TEAM';
    btn.onClick(() => wixLocation.to('/'));
}

function animate() {
    const repeater = $w(IDS.affordability.repeater);
    if (!repeater) return;
    repeater.hide();
    whenInView(repeater, () => reveal(repeater, { direction: 'up', duration: 600 }));
}
