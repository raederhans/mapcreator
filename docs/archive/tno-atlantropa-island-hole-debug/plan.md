# TNO Atlantropa Island/Hole Tail Debug Plan

## Goal

Fix the remaining TNO 1962 Atlantropa visual and interaction defects:

- One abnormal sea tile southwest of Greece has wrong color and cannot be selected.
- Large island cores around Balearic, Crete, and Cyprus show holes or incomplete geometry.

## Steps

- [ ] Reproduce the failing sea tile and island holes in browser/runtime diagnostics.
- [ ] Map the visible defects to concrete Atlantropa feature ids and geometry payloads.
- [ ] Identify the generation path that produces the bad ring/hole or layer behavior.
- [ ] Add the smallest regression check for the confirmed failure mode.
- [ ] Patch the generation path and rebuild TNO 1962 checked-in assets.
- [ ] Verify with strict contracts, targeted tests, and browser click/visual evidence.

