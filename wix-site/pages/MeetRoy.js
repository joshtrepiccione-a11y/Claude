// "Meet Roy" page — long-form bio + milestones + a join CTA.
//
// EDITOR SETUP:
//   #meetRoyPortrait     large editorial portrait, left or right column
//   #meetRoyBio          rich-text element with the long-form bio
//   #meetRoyTimeline     vertical repeater of milestone cards
//      inside each item: #milestoneYear, #milestoneTitle, #milestoneCopy
//   #meetRoyJoinBtn      Carolina-blue button, "JOIN THE TEAM",
//                        scrolls back to home hero on click

import wixLocation from 'wix-location';
import { IDS } from 'public/constants.js';
import { reveal, whenInView } from 'public/animations.js';

const TIMELINE = [
    { _id: 't1', year: '1957', title: 'Born in Nashville, NC',
      copy: 'Raised in a small farming community by parents who believed in public service and public schools.' },
    { _id: 't2', year: '1986', title: 'Elected to the NC General Assembly',
      copy: 'Began a career representing rural and small-town North Carolina in the state legislature.' },
    { _id: 't3', year: '2001', title: 'Sworn in as Attorney General',
      copy: 'Served four terms — taking on price-gougers, defending consumers, and clearing the rape-kit backlog.' },
    { _id: 't4', year: '2017', title: 'Sworn in as the 75th Governor',
      copy: 'Led North Carolina through hurricanes, a pandemic, and a historic period of economic recruitment.' },
    { _id: 't5', year: '2023', title: 'Medicaid Expansion delivered',
      copy: 'After a decade-long fight, expanded health coverage to more than 600,000 North Carolinians.' },
    { _id: 't6', year: 'Today', title: 'Fighting for North Carolina',
      copy: 'On the road, in every county, making the case that government should make stuff cost less and work better.' }
];

const BIO = `
Roy Cooper grew up in Nashville, North Carolina — the son of a teacher and a
lawyer who taught him that public institutions only work when ordinary people
insist they do. He carried that lesson through the state legislature, four
terms as Attorney General, and two terms as Governor.

As Governor he expanded Medicaid to more than 600,000 North Carolinians,
recruited record-breaking economic investment to every region of the state,
raised teacher pay each year he was in office, and led the state through
Hurricanes Florence, Matthew, and Helene as well as the COVID-19 pandemic.

Now he’s asking North Carolinians to join him in the next chapter — a campaign
focused on making everyday life more affordable, defending the freedom to
vote, and proving that pragmatic, prepared leadership still delivers.
`;

$w.onReady(() => {
    const bio = $w(IDS.meetRoy.bio);
    if (bio) bio.text = BIO.trim();

    wireTimeline();
    wireJoinCta();
    animate();
});

function wireTimeline() {
    const repeater = $w(IDS.meetRoy.timeline);
    if (!repeater) return;
    repeater.data = TIMELINE;
    repeater.onItemReady(($item, data) => {
        $item('#milestoneYear').text  = data.year;
        $item('#milestoneTitle').text = data.title;
        $item('#milestoneCopy').text  = data.copy;
    });
}

function wireJoinCta() {
    const btn = $w(IDS.meetRoy.ctaJoin);
    if (!btn) return;
    btn.label = 'JOIN THE TEAM';
    btn.onClick(() => wixLocation.to('/'));
}

function animate() {
    const portrait = $w(IDS.meetRoy.portrait);
    if (portrait) {
        portrait.hide();
        whenInView(portrait, () => reveal(portrait, { direction: 'fade', duration: 800 }));
    }
    const timeline = $w(IDS.meetRoy.timeline);
    if (timeline) {
        timeline.hide();
        whenInView(timeline, () => reveal(timeline, { direction: 'up' }));
    }
}
