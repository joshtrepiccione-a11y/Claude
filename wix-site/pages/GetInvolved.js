// "Get Involved" — actions grid (donate / volunteer / host / yard sign)
// plus a fuller sign-up form (adds ZIP + interest dropdown).
//
// EDITOR SETUP:
//   #actionsRepeater   four cards, equal columns
//      inside each item: #actionIcon, #actionTitle, #actionCopy, #actionBtn
//   Form on the same page:
//     #giName, #giEmail, #giPhone, #giZip   inputs
//     #giInterest                            dropdown
//     #giSubmit                              button "JOIN THE TEAM"
//     #giStatus                              hidden text

import wixLocation from 'wix-location';
import { IDS, DONATE_URL } from 'public/constants.js';
import { submitSignup } from 'backend/signup.web.js';

const ACTIONS = [
    { _id: 'a1', title: 'Donate',
      copy:  'Chip in to help us reach voters in every county.',
      cta:   'GIVE NOW', kind: 'donate' },
    { _id: 'a2', title: 'Volunteer',
      copy:  'Knock doors, make calls, register voters — pick what fits your schedule.',
      cta:   'SIGN UP', kind: 'volunteer' },
    { _id: 'a3', title: 'Host an Event',
      copy:  'Bring the campaign to your neighborhood, church, or living room.',
      cta:   'GET STARTED', kind: 'host' },
    { _id: 'a4', title: 'Get a Yard Sign',
      copy:  'Show your neighbors where you stand.',
      cta:   'REQUEST ONE', kind: 'sign' }
];

const INTERESTS = [
    { label: 'How do you want to help?', value: '' },
    { label: 'Volunteering',             value: 'volunteer' },
    { label: 'Hosting an event',         value: 'host' },
    { label: 'Voter registration',       value: 'voter_reg' },
    { label: 'Yard sign',                value: 'sign' },
    { label: 'Just keep me informed',    value: 'subscribe' }
];

$w.onReady(() => {
    wireActions();
    wireInterestDropdown();
    wireForm();
});

function wireActions() {
    const repeater = $w(IDS.getInvolved.actionsRepeater);
    if (!repeater) return;
    repeater.data = ACTIONS;
    repeater.onItemReady(($item, data) => {
        $item('#actionTitle').text = data.title;
        $item('#actionCopy').text  = data.copy;
        const btn = $item('#actionBtn');
        if (!btn) return;
        btn.label = data.cta;
        btn.onClick(() => routeAction(data.kind));
    });
}

function routeAction(kind) {
    if (kind === 'donate') return wixLocation.to(DONATE_URL);
    const interest = $w(IDS.getInvolved.formInterest);
    if (interest && interest.value !== undefined) interest.value = kind;
    const form = $w(IDS.getInvolved.formName);
    if (form && form.scrollTo) form.scrollTo();
}

function wireInterestDropdown() {
    const dd = $w(IDS.getInvolved.formInterest);
    if (!dd || dd.options === undefined) return;
    dd.options = INTERESTS;
}

function wireForm() {
    const btn    = $w(IDS.getInvolved.submit);
    const status = $w(IDS.getInvolved.status);
    if (!btn) return;
    if (status) status.hide();

    btn.label = 'JOIN THE TEAM';
    btn.onClick(async () => {
        const payload = readForm();
        const error = validate(payload);
        if (error) return showStatus(status, error);

        btn.disable();
        showStatus(status, 'Submitting…');
        try {
            await submitSignup({ ...payload, source: 'get_involved' });
            showStatus(status, 'Thanks — we’ll be in touch soon.');
            clearForm();
        } catch (err) {
            console.error('Get-involved signup failed', err);
            showStatus(status, 'Something went wrong. Please try again.');
        } finally {
            btn.enable();
        }
    });
}

function readForm() {
    const get = id => {
        const $el = $w(id);
        return $el ? ($el.value || '').trim() : '';
    };
    return {
        name:     get(IDS.getInvolved.formName),
        email:    get(IDS.getInvolved.formEmail),
        phone:    get(IDS.getInvolved.formPhone),
        zip:      get(IDS.getInvolved.formZip),
        interest: get(IDS.getInvolved.formInterest)
    };
}

function clearForm() {
    ['formName','formEmail','formPhone','formZip'].forEach(k => {
        const $el = $w(IDS.getInvolved[k]);
        if ($el) $el.value = '';
    });
    const dd = $w(IDS.getInvolved.formInterest);
    if (dd) dd.value = '';
}

function validate({ name, email, zip }) {
    if (!name) return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email.';
    if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) return 'Please enter a valid ZIP.';
    return null;
}

function showStatus($el, text) {
    if (!$el) return;
    $el.text = text;
    $el.show('FadeIn', { duration: 200 });
}
