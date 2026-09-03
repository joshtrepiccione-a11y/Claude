# Content needed from Post 186

The site is built and works, but several things are deliberately blank rather than invented. Anything marked as a fact below stays hidden on the public site until it is filled in through the admin area at `/admin/content`. A live version of this list, showing what is still missing, is at `/admin/checklist`.

## 1. Brand files (blocking)

The official `American-Legion-Brandmark.zip` was not included, so the header and footer currently show the Post name as text. Copy the official files into `public/brand` using the exact names in `public/brand/README.md`. Do not edit, recolor, or run them through any image tool.

## 2. Facts the site is waiting on

**Contact**
- Main phone number, and whether it rings at the hall or a volunteer's phone
- Public email address for general questions
- Who receives membership inquiries, rental inquiries, and general messages
- Days and hours the hall or office is open
- Realistic response time for each of the three forms, so the confirmation messages are accurate

**About the Post**
- Founding year and a short, verified history
- Verified biography of Frank M. Calletta and the date the hall was named for him
- Current officers: names, titles, and whether each wants to be listed publicly
- Any auxiliary units, Sons of the American Legion squadron, or Riders chapter to mention
- Meeting schedule

**Hall rentals**
- Seated and standing capacity
- Square footage and room dimensions
- What is included: tables, chairs, kitchen, bar, sound, parking, projector
- Rental rates, deposit, and cancellation terms, or a statement that rates are quoted per event
- Alcohol policy, including whether outside alcohol or a licensed bartender is required
- Insurance or certificate requirements
- Accessibility details: entrance, restrooms, parking
- Who signs the rental agreement, and how it is sent

**Membership**
- Anything Post 186 wants to add beyond the national eligibility rules
- Current dues, or a note that dues are confirmed when someone joins

## 3. Draft copy to approve or rewrite

These are written in a neutral voice and are visible on the site now. Read them and either approve or replace:
- Home page mission summary
- About page mission statement
- Membership overview
- Hall rentals overview
- Privacy page and accessibility page (both need a real contact for requests and reports)

## 4. Photos

None are included. Real photos of the hall, members, ceremonies, and community work make a large difference. For each one, provide a short written description of what it shows, which becomes the alternative text for people using screen readers. Place files in `public/images`. Confirm permission before publishing photos of identifiable people, especially minors.

## 5. Before launch

- Delete every item marked `[Demo]` from Events and News
- Enter real upcoming events
- Publish a real first news post
- Confirm the privacy page reflects what actually happens to inquiry data, and who to contact to have it deleted
- Confirm the accessibility page lists a real person to contact about barriers
- Decide who holds the admin password, and set a reminder to change it when volunteers change
