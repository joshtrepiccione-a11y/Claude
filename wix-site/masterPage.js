// Site-wide code: top utility donate banner, header (logo + nav + social
// row + DONATE button), mobile menu, footer.
//
// EDITOR SETUP (do once, in the Wix Editor):
//   Top utility strip — full-width, Carolina-blue background:
//     #utilityDonateBar    the strip
//     #utilityDonateLink   centered link, navy bold uppercase text:
//                          "DONATE TO BECOME A FOUNDING MEMBER OF OUR CAMPAIGN NOW"
//
//   Header strip — navy background, white text, ~120px tall:
//     #headerNav
//     #navLogo             image; the "roy COOPER for north carolina" mark
//     #navMenu             horizontal menu (items populated from NAV_ITEMS)
//     #navSocialRepeater   inline repeater (rendered as a row of icon links)
//                          inside each item: #socialLink, #socialIcon
//     #navDonateBtn        red rectangular button, white bold "DONATE"
//     #navMobileToggle     hamburger button, mobile-only
//     #navMobileSheet      hidden box, contains nav + donate + social
//
//   Footer strip — navy:
//     #siteFooter
//     #footerSocial        repeater duplicating header social
//     #footerPaidFor       text element, FEC disclaimer line
//     #footerLegal         text: privacy, terms, contact email

import wixLocation from 'wix-location';
import {
    IDS, SOCIAL, NAV_ITEMS, DONATE_URL, PAID_FOR
} from 'public/constants.js';

$w.onReady(() => {
    wireUtilityBar();
    wireLogo();
    wireDonateButton();
    wireMobileMenu();
    wireSocial(IDS.nav.social);
    wireSocial(IDS.footer.social);
    wireFooterCopy();
    setActiveNavItem();
});

function wireUtilityBar() {
    const link = $w(IDS.utility.link);
    if (!link) return;
    link.text = 'DONATE TO BECOME A FOUNDING MEMBER OF OUR CAMPAIGN NOW ▶';
    if (link.onClick) link.onClick(() => openDonate());
}

function wireLogo() {
    const logo = $w(IDS.nav.logo);
    if (logo && logo.onClick) {
        logo.onClick(() => wixLocation.to('/'));
        if (logo.alt !== undefined) logo.alt = 'Roy Cooper for North Carolina';
    }
}

function wireDonateButton() {
    const btn = $w(IDS.nav.donateBtn);
    if (!btn) return;
    btn.label = 'DONATE';
    btn.onClick(() => openDonate());
}

function wireMobileMenu() {
    const toggle = $w(IDS.nav.mobileToggle);
    const sheet  = $w(IDS.nav.mobileSheet);
    if (!toggle || !sheet) return;

    sheet.hide();
    let open = false;

    toggle.onClick(async () => {
        open = !open;
        if (open) {
            await sheet.show('SlideIn', { direction: 'right', duration: 220 });
        } else {
            await sheet.hide('SlideOut', { direction: 'right', duration: 180 });
        }
    });

    wixLocation.onChange(async () => {
        if (open) {
            open = false;
            await sheet.hide('FadeOut', { duration: 150 });
        }
    });
}

function wireSocial(repeaterId) {
    const repeater = $w(repeaterId);
    if (!repeater) return;
    repeater.data = SOCIAL;
    repeater.onItemReady(($item, data) => {
        const link = $item('#socialLink');
        const icon = $item('#socialIcon');
        if (link) {
            link.target = '_blank';
            link.link = data.url;
            if (link.label !== undefined) link.label = '';
        }
        if (icon && icon.alt !== undefined) icon.alt = data.label;
    });
}

function wireFooterCopy() {
    const paid = $w(IDS.footer.paidFor);
    if (paid) paid.text = PAID_FOR;
}

function setActiveNavItem() {
    const path = wixLocation.path[0] ? `/${wixLocation.path[0]}` : '/';
    const menu = $w(IDS.nav.menu);
    if (!menu) return;
    const current = NAV_ITEMS.find(item => item.link === path);
    if (current && menu.setCurrentItem) menu.setCurrentItem(current.link);
}

function openDonate() {
    wixLocation.to(DONATE_URL);
}
