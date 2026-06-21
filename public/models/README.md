# Drop your Mixamo characters here

The game runs out of the box with a built-in placeholder character (three.js Xbot).
To get **realistic** fighters, add Mixamo FBX files here. The engine auto-detects them on reload.

## Files the engine looks for

| Save as          | Mixamo search                                  | Required |
| ---------------- | ---------------------------------------------- | -------- |
| `fighter.fbx`    | a character, **Download → With Skin**          | ✅       |
| `idle.fbx`       | Fighting Idle                                  | ✅       |
| `walk.fbx`       | Walking (tick *In Place*)                      | ✅       |
| `punch.fbx`      | Cross Punch / Jab                              | ✅       |
| `kick.fbx`       | Roundhouse Kick                                | ✅       |
| `hit.fbx`        | Hit Reaction                                   | ✅       |
| `ko.fbx`         | Falling Back Death                             | ✅       |
| `jump.fbx`       | Jump (tick *In Place*)                         | optional |
| `combo.fbx`      | Martial Arts Combo                             | optional |
| `block.fbx`      | Standing Block                                 | optional |
| `victory.fbx`    | Victory / Cheering                             | optional |
| `walkback.fbx`   | Walking Backwards (tick *In Place*)            | optional |
| `fighter2.fbx`   | a 2nd character, With Skin (P2)                | optional |

## Download settings

- **Character** (`fighter.fbx` / `fighter2.fbx`): Format **FBX Binary**, **With Skin**.
- **Animations** (everything else): Format **FBX Binary**, **Without Skin**, **30 FPS**.
- Apply every animation to the **same** character so the skeleton matches.

Missing files fall back automatically (e.g. `kick` → `punch` → `idle`), so add what you
can and iterate. Filenames are case-sensitive and must match exactly (all lowercase).
