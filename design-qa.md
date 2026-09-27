# Homepage design QA

**Findings**

No actionable P0, P1, or P2 visual mismatch remains in the selected homepage composition.

**Comparison target and evidence**

- Source visual truth: `F:\projects\trustech project\design-references\selected-combined.png` (1024 × 1536 px). Its focused top-region crop is `F:\projects\trustech project\design-references\selected-hero-reference.png` (1024 × 768 px).
- Rendered implementation: `http://localhost:3000/en`; final desktop, hero, mobile and French captures are `design-final-seven-schools-1024.png`, `design-final-seven-schools-hero-1024.png`, `design-final-seven-schools-mobile-en.png`, and `design-seven-schools-fr.png` in the frontend root. These supersede the earlier two-school captures.
- Viewport/state: desktop 1024 × 768 CSS px, device scale factor 1, English public homepage, default state; mobile 390 × 844 CSS px, default state. No theme or authentication state changes. The focused comparison is equal-pixel, 1:1 density; the full-page images have equal width but different heights because the implementation uses readable, responsive section spacing and a fuller footer.
- Full-view comparison: the original two-school mock was superseded by the user's explicit seven-school requirement. The implementation retains the shield-led header, split editorial student hero, three featured fields, four-step admissions timeline, and closing admission callout, and expands the school section to seven distinct image-led cards. The longer page is intentional and preserves the reading sequence.
- Focused comparison: the 1024 × 768 source crop and rendered hero crop were opened together at original resolution. Both show the dark-blue serif headline, gold primary and blue-outline secondary buttons, student portrait on the right, and school section entering immediately below the hero. The rendered hero ends at approximately y=506 versus y=502 in the source.

**Required fidelity surfaces**

- Fonts/typography: serif display text and clean sans-serif navigation/body match the source hierarchy; headings wrap similarly in the equal-size hero crop. Local self-hosted fonts load without external font requests. Small eyebrow labels remain readable.
- Spacing/layout rhythm: the header, hero and school section align closely in the focused crop. Full-page sections are taller than the image concept to retain real readable text and touch targets. No desktop or mobile horizontal overflow was observed.
- Colors/tokens: gold, deep blue, pale blue, white and subtle borders retain the brand balance and sufficient foreground contrast. Gold is consistently reserved for primary action and selected accents.
- Image quality/assets: the user-supplied shield appears in header and footer; the hero, seven different school images and three program images are sharp, relevant illustrative raster assets with no empty placeholders. These generated school images are editorial illustrations, not claims about actual campus facilities. The source's translucent geometric planes are not reproduced; see P3 follow-up.
- Copy/content: the selected headline, "Programs for a changing world", and "Your future in four steps" are present. All seven schools and the full official English institute name are present. The French footer translates the full name as "Institut universitaire Trustech de gestion des entreprises et des sciences biomédicales." Supporting copy avoids unverified claims about tuition, accreditation or outcomes.

**Interaction and responsive checks**

- Primary application CTA navigates to the existing applicant registration route; the registration page rendered with fields.
- Mobile menu opens with navigation and EN/FR controls. The French homepage rendered translated content.
- Desktop at 1024 CSS px and mobile at 390 CSS px had no document horizontal overflow, all images loaded, and no browser console errors in the checked state.

**Comparison history**

1. First desktop capture: [P2] the hero was about 590 px high and the mobile-style navigation appeared at 1024 px. Fixed the breakpoint (`xl` to `lg`) and reduced the mid-size hero to about 430 px. The next source/implementation comparison showed full desktop navigation and the intended hero proportion.
2. Second desktop capture: [P2] the school section began roughly 70 px too low. Reduced the school-section top spacing at the mid-size breakpoint. The final 1024 × 768 focused comparison places the hero end and following school heading close to the source.
3. User correction superseded the original two-school mock: seven school cards, each with a distinct thematic image, were added. The live English and French pages were checked at desktop and mobile sizes; the French footer wording was verified in the rendered page.

**Open questions**

- None blocking this aesthetic pass. The remaining public routes should receive this same visual language before backend modules expand.

**Implementation checklist**

- [x] Brand logo, responsive header and hero
- [x] Seven schools with distinct images, featured programs, four-step admissions and closing callout
- [x] Bilingual copy and live navigation for primary calls to action
- [x] Desktop and mobile visual checks

**Follow-up polish**

- [P3] Add a bespoke translucent gold/blue dimensional motif to the hero when image asset generation is available again; the current photo and raised caption provide depth, but not the concept's full layered geometry.
- [P3] Continue the same editorial visual system across Programs, Admissions, About, News and Contact.

final result: passed
