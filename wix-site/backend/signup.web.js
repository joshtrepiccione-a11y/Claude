// Backend signup handler — receives form payloads from Home and Get Involved,
// upserts the supporter into the CRM, writes a row to the Supporters CMS
// collection (audit trail), and fires the welcome triggered email.
//
// EDITOR SETUP:
//   1. Create a CMS collection "Supporters" with fields:
//        name (Text), email (Text, indexed), phone (Text),
//        zip (Text), interest (Text), source (Text), createdAt (Date).
//   2. In CRM > Triggered Emails create one named "rc-welcome" and copy
//      its emailId; set TRIGGERED_EMAIL_ID below.
//   3. Set the collection's permissions so only Admin can read; this module
//      writes with elevated permissions via wix-data options.

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { contacts } from 'wix-crm-backend';
import { triggeredEmails } from 'wix-crm-backend';

const COLLECTION = 'Supporters';
const TRIGGERED_EMAIL_ID = 'rc-welcome';

export const submitSignup = webMethod(
    Permissions.Anyone,
    async (input) => {
        const payload = sanitize(input);
        const error = validate(payload);
        if (error) throw new Error(error);

        const contactId = await upsertContact(payload);
        await logSupporter(payload, contactId);
        await sendWelcome(contactId).catch(err =>
            console.warn('Welcome email failed (non-fatal)', err)
        );
        return { ok: true };
    }
);

function sanitize(input = {}) {
    const trim = v => (typeof v === 'string' ? v.trim() : '');
    return {
        name:     trim(input.name),
        email:    trim(input.email).toLowerCase(),
        phone:    trim(input.phone),
        zip:      trim(input.zip),
        interest: trim(input.interest),
        source:   trim(input.source) || 'unknown'
    };
}

function validate(p) {
    if (!p.email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return 'Invalid email.';
    if (p.phone && p.phone.replace(/\D/g, '').length < 10) {
        return 'Invalid phone number.';
    }
    return null;
}

async function upsertContact({ name, email, phone }) {
    const [first, ...rest] = (name || '').split(' ');
    const contactInfo = {
        name: { first: first || '', last: rest.join(' ') },
        emails: email ? [{ email }] : [],
        phones: phone ? [{ phone }] : []
    };
    const result = await contacts.appendOrCreateContact(contactInfo);
    return result.contactId;
}

async function logSupporter(payload, contactId) {
    return wixData.insert(
        COLLECTION,
        { ...payload, contactId, createdAt: new Date() },
        { suppressAuth: true }
    );
}

async function sendWelcome(contactId) {
    if (!TRIGGERED_EMAIL_ID || !contactId) return;
    return triggeredEmails.emailContact(TRIGGERED_EMAIL_ID, contactId, {
        variables: {}
    });
}
