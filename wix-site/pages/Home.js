// Home page — full-bleed hero with photo background and a sign-up form.
//
// EDITOR SETUP — single hero section, full viewport height:
//   #heroBackground   navy box, full-bleed, holds everything
//   #heroPortrait     editorial photo of Roy at podium with US flag,
//                     anchored to the right ~55% of the viewport
//   #heroHeadline     display text, bold uppercase, white
//                     copy: "FIGHTING FOR NORTH CAROLINA"
//   Sign-up form (left ~45% of the viewport, on top of the photo):
//     #signupName       input, placeholder "Name"
//     #signupEmail      input, placeholder "Email Address"
//     #signupPhone      input, placeholder "Mobile Phone", inputType=tel
//     #signupSubmit     full-width button, Carolina-blue fill,
//                       label "JOIN THE TEAM"
//     #signupStatus     hidden text, used for inline status
//     #signupTerms      italic body text, holds SMS_TERMS
//     #signupNotYouLink small link, "Not <name>? Click here."

import wixLocation from 'wix-location';
import wixStorage from 'wix-storage';
import { IDS, SMS_TERMS } from 'public/constants.js';
import { submitSignup } from 'backend/signup.web.js';

const STORAGE_KEY = 'rc_supporter';

$w.onReady(() => {
    setStaticCopy();
    prefillFromStorage();
    wireSubmit();
    wireNotYou();
});

function setStaticCopy() {
    const headline = $w(IDS.home.headline);
    if (headline) headline.text = 'FIGHTING FOR NORTH CAROLINA';

    const terms = $w(IDS.home.form.terms);
    if (terms) terms.html = formatTerms(SMS_TERMS);

    const status = $w(IDS.home.form.status);
    if (status) status.hide();
}

function prefillFromStorage() {
    let saved;
    try {
        const raw = wixStorage.local.getItem(STORAGE_KEY);
        saved = raw ? JSON.parse(raw) : null;
    } catch (_) {
        saved = null;
    }
    if (!saved) return;

    const nameInput  = $w(IDS.home.form.name);
    const emailInput = $w(IDS.home.form.email);
    const phoneInput = $w(IDS.home.form.phone);
    const notYou     = $w(IDS.home.form.notYou);

    if (nameInput && saved.name)   nameInput.value  = saved.name;
    if (emailInput && saved.email) emailInput.value = saved.email;
    if (phoneInput && saved.phone) phoneInput.value = saved.phone;

    if (notYou) {
        notYou.text = `Not ${saved.name || 'you'}? Click here.`;
        notYou.show();
    }
}

function wireSubmit() {
    const btn    = $w(IDS.home.form.submit);
    const name   = $w(IDS.home.form.name);
    const email  = $w(IDS.home.form.email);
    const phone  = $w(IDS.home.form.phone);
    const status = $w(IDS.home.form.status);
    if (!btn) return;

    btn.label = 'JOIN THE TEAM';

    btn.onClick(async () => {
        const payload = {
            name:  (name && name.value || '').trim(),
            email: (email && email.value || '').trim(),
            phone: (phone && phone.value || '').trim()
        };
        const error = validate(payload);
        if (error) return showStatus(status, error, 'error');

        btn.disable();
        showStatus(status, 'Submitting…', 'info');
        try {
            await submitSignup({ ...payload, source: 'home_hero' });
            persistSupporter(payload);
            showStatus(status, 'You’re on the team. Thank you.', 'ok');
        } catch (err) {
            console.error('Signup failed', err);
            showStatus(status, 'Something went wrong. Please try again.', 'error');
        } finally {
            btn.enable();
        }
    });
}

function wireNotYou() {
    const link = $w(IDS.home.form.notYou);
    if (!link) return;
    link.hide();
    link.onClick(() => {
        try { wixStorage.local.removeItem(STORAGE_KEY); } catch (_) {}
        ['name','email','phone'].forEach(k => {
            const input = $w(IDS.home.form[k]);
            if (input) input.value = '';
        });
        link.hide();
    });
}

function persistSupporter({ name, email, phone }) {
    try {
        wixStorage.local.setItem(STORAGE_KEY, JSON.stringify({ name, email, phone }));
    } catch (_) {
        // Storage unavailable (private mode, etc.) — non-fatal.
    }
}

function validate({ name, email, phone }) {
    if (!name)  return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email.';
    if (phone && phone.replace(/\D/g, '').length < 10) {
        return 'Please enter a valid mobile number, or leave it blank.';
    }
    return null;
}

function showStatus($el, text, kind) {
    if (!$el) return;
    $el.text = text;
    $el.show('FadeIn', { duration: 200 });
    void kind;
}

// Wraps the trailing "review here." in an actual link so the terms read
// like the reference site without forcing the editor user to set rich text.
function formatTerms(raw) {
    return raw.replace(
        'review here.',
        'review <a href="/privacy" style="text-decoration:underline;">here</a>.'
    );
}
