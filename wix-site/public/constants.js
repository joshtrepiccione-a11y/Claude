// Shared design tokens, nav, and element-ID maps used across pages.
// Velo public modules can be imported from any page or backend file:
//   import { COLORS, FONTS, IDS } from 'public/constants.js';

// Palette mirrors the reference site: deep navy field, Carolina-blue
// accents/CTAs, red donate button, white type.
export const COLORS = {
    navy:       '#0E2E5C', // primary background, header
    navyDeep:   '#0A2147', // header/footer base
    carolina:   '#A5C8E5', // utility donate banner, accent strokes
    carolinaCt: '#9CC5E8', // CTA fill ("Join the Team")
    red:        '#C8232B', // DONATE button
    redHover:   '#A91C23',
    paper:      '#FFFFFF',
    paperMuted: '#F2F4F7',
    ink:        '#0A1628', // body text on light bg
    rule:       '#1B3E73', // hairline rules on navy
    muted:      '#5A6577'
};

export const FONTS = {
    // Heavy condensed sans for headlines; clean sans for body.
    display: '"Barlow Condensed", "Helvetica Neue", Arial, sans-serif',
    body:    'Inter, "Helvetica Neue", Arial, sans-serif'
};

export const SPACING = { xs: 8, sm: 16, md: 24, lg: 48, xl: 96 };

export const ANIMATION = {
    fast: { duration: 200 },
    base: { duration: 500 },
    slow: { duration: 900 }
};

// Centralized element IDs. Add the matching IDs in the Wix Editor
// (right panel > Properties & Events > ID).
export const IDS = {
    utility: {
        bar:       '#utilityDonateBar',     // top sky-blue strip
        link:      '#utilityDonateLink'     // "DONATE TO BECOME A FOUNDING MEMBER..."
    },
    nav: {
        wrapper:      '#headerNav',
        logo:         '#navLogo',           // image: "roy COOPER for north carolina"
        menu:         '#navMenu',           // horizontal menu
        social:       '#navSocialRepeater', // inline social icon row
        donateBtn:    '#navDonateBtn',      // red rectangular button
        mobileToggle: '#navMobileToggle',
        mobileSheet:  '#navMobileSheet'
    },
    footer: {
        wrapper:    '#siteFooter',
        social:     '#footerSocial',
        legal:      '#footerLegal',
        paidFor:    '#footerPaidFor'        // FEC-style disclaimer line
    },
    home: {
        heroBg:     '#heroBackground',
        heroPhoto:  '#heroPortrait',
        headline:   '#heroHeadline',        // "FIGHTING FOR NORTH CAROLINA"
        form: {
            name:    '#signupName',
            email:   '#signupEmail',
            phone:   '#signupPhone',
            submit:  '#signupSubmit',       // "JOIN THE TEAM"
            status:  '#signupStatus',
            terms:   '#signupTerms',        // SMS terms paragraph
            notYou:  '#signupNotYouLink'    // "Not <name>? Click here."
        }
    },
    meetRoy: {
        portrait: '#meetRoyPortrait',
        bio:      '#meetRoyBio',
        timeline: '#meetRoyTimeline',
        ctaJoin:  '#meetRoyJoinBtn'
    },
    getInvolved: {
        actionsRepeater: '#actionsRepeater',  // volunteer / host / donate / yard sign
        formName:    '#giName',
        formEmail:   '#giEmail',
        formPhone:   '#giPhone',
        formZip:     '#giZip',
        formInterest:'#giInterest',
        submit:      '#giSubmit',
        status:      '#giStatus'
    },
    affordability: {
        intro:    '#affordIntro',
        repeater: '#affordRepeater',         // grocery / housing / health / energy
        ctaJoin:  '#affordJoinBtn'
    },
    store: {
        repeater: '#storeRepeater',
        empty:    '#storeEmpty'
    }
};

// Order matches the screenshot's icon row.
export const SOCIAL = [
    { _id: 's1', label: 'Facebook',  url: 'https://facebook.com/',  icon: 'facebook' },
    { _id: 's2', label: 'Instagram', url: 'https://instagram.com/', icon: 'instagram' },
    { _id: 's3', label: 'X',         url: 'https://x.com/',         icon: 'x' },
    { _id: 's4', label: 'Bluesky',   url: 'https://bsky.app/',      icon: 'bluesky' },
    { _id: 's5', label: 'TikTok',    url: 'https://tiktok.com/',    icon: 'tiktok' },
    { _id: 's6', label: 'Threads',   url: 'https://threads.net/',   icon: 'threads' },
    { _id: 's7', label: 'Flickr',    url: 'https://flickr.com/',    icon: 'flickr' }
];

export const NAV_ITEMS = [
    { label: 'Home',                link: '/' },
    { label: 'Meet Roy',            link: '/meet-roy' },
    { label: 'Get Involved',        link: '/get-involved' },
    { label: 'Make Stuff Cost Less',link: '/make-stuff-cost-less' },
    { label: 'Store',               link: '/store' }
];

// External donate URL — swap for the live processor (ActBlue, etc.).
export const DONATE_URL = 'https://secure.actblue.com/donate/roy-cooper';

// Copy block for the SMS-terms paragraph under the hero form.
export const SMS_TERMS =
    'SMS Terms: By providing your phone number and opting-in, you agree to ' +
    'receive periodic automated text messages about donating and voter ' +
    'contact. Msg Frequency varies. Msg & Data rates may apply. Text STOP ' +
    'to opt-out. For questions, please reach out to contact@roycooper.com. ' +
    'Your mobile information will not be shared with third parties/affiliates ' +
    'for marketing/promotional purposes. To learn more about Cooper for North ' +
    'Carolina’s personal information handling practices, review here.';

export const PAID_FOR =
    'Paid for by Cooper for North Carolina.';
