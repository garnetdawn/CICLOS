
import { Sprite } from 'pixi.js';

const carriedLeafFollowers = new WeakMap();

// Creates a world leaf and wires its click actions.
export function createLeaf({
    texture, parent, ticker, player, x, y,
    app, viewport, eatTex, grabTex, glowTex
}) {
    const leaf = new Sprite(texture);
    leaf.position.set(x, y);
    leaf.tint = 0x000000;
    leaf.anchor.set(0.5);
    leaf.eventMode = 'static';
    leaf.cursor = 'pointer';
    parent.addChild(leaf);

    let eaten = false;

    const updateTint = () => {
        const distance = Math.hypot(
            player.container.x - leaf.x,
            player.container.y - leaf.y
        );
        const amount = Math.max(0, Math.min(1, 1 - distance / 500));
        const smooth = amount * amount * (3 - 2 * amount);
        const gray = Math.round(smooth * 255);

        leaf.tint = (gray << 16) | (gray << 8) | gray;
    };

    ticker.add(updateTint);

    let sceneOpen = false;

    leaf.on('pointerdown', (event) => {
        event.stopPropagation();

        if (sceneOpen) return;
        sceneOpen = true;
        leaf.eventMode = 'none';

        const moveBeforeScene = player.move;

        leafScene({
            leaf,
            player,
            app,
            viewport,
            eatTex,
            grabTex,
            glowTex,
            ticker,
            moveBeforeScene,
            onEat: () => {
                if (eaten) return;
                eaten = true;
                ticker.remove(updateTint);
                player.leavesEaten += 1;
                player.addSegment();

                eatLeaf(leaf, ticker, () => {
                    leaf.removeFromParent();
                    leaf.destroy();
                });
            },
            onGrab: () => {
                ticker.remove(updateTint);
                leaf.eventMode = 'none';
                leaf.removeFromParent();
                player.container.addChild(leaf);
                const carryOffset = findLeafCarryOffset(player, leaf);
                leaf.label = 'Carried leaf';
                leaf.position.set(
                    player.body.x + carryOffset.x,
                    player.body.y + carryOffset.y,
                );
                leaf.rotation = (Math.random() - 0.5) * 0.7;
                const scaleFactor = 1 - Math.random() * 0.15;
                leaf.scale.set(
                    leaf.scale.x * scaleFactor,
                    leaf.scale.y * scaleFactor,
                );
                leaf.zIndex = player.body.zIndex + 1;

                // Keep the grabbed leaf aligned as the player's body moves.
                const followBody = () => {
                    leaf.position.set(
                        player.body.x + carryOffset.x,
                        player.body.y + carryOffset.y,
                    );
                };
                ticker.add(followBody);
                carriedLeafFollowers.set(leaf, followBody);
            },
        });
    });

    return leaf;
}

// Feed the nearest clicked NPC one carried leaf when the player is close enough.
export function feedNearbyNpc({ player, npc, ticker, maxDistance = 300 }) {
    const distance = Math.hypot(
        player.container.x - npc.container.x,
        player.container.y - npc.container.y,
    );
    if (distance > maxDistance) return false;

    const leaf = player.container.children.find(
        (child) => child.label === 'Carried leaf',
    );
    if (!leaf) return false;

    const followPlayerBody = carriedLeafFollowers.get(leaf);
    if (followPlayerBody) {
        ticker.remove(followPlayerBody);
        carriedLeafFollowers.delete(leaf);
    }

    leaf.removeFromParent();
    npc.container.addChild(leaf);
    leaf.position.set(npc.body.x, npc.body.y + 60);
    leaf.zIndex = npc.body.zIndex + 1;

    const followNpcBody = () => {
        leaf.position.set(npc.body.x, npc.body.y + 60);
    };
    ticker.add(followNpcBody);

    eatLeaf(leaf, ticker, () => {
        ticker.remove(followNpcBody);
        npc.addSegment();
        leaf.removeFromParent();
        leaf.destroy();
    });

    return true;
}

// Choose a randomized spot near the body edge, avoiding carried leaves where possible.
function findLeafCarryOffset(player, leaf) {
    const body = player.body;
    const carriedOffsets = player.container.children
        .filter((child) => child.label === 'Carried leaf')
        .map((child) => ({
            x: child.x - body.x,
            y: child.y - body.y,
        }));
    const radiusX = Math.max(body.width * 0.25, body.width / 2 - leaf.width * 0.15);
    const radiusY = Math.max(body.height * 0.25, body.height / 2 - leaf.height * 0.15);
    const minSpacing = Math.max(leaf.width, leaf.height);

    let bestOffset = { x: radiusX, y: 0 };
    let bestClearance = -1;

    for (let attempt = 0; attempt < 40; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const candidate = {
            x: Math.cos(angle) * radiusX,
            y: Math.sin(angle) * radiusY,
        };
        const clearance = carriedOffsets.length
            ? Math.min(...carriedOffsets.map((offset) => Math.hypot(
                candidate.x - offset.x,
                candidate.y - offset.y,
            )))
            : Infinity;

        if (clearance > bestClearance) {
            bestOffset = candidate;
            bestClearance = clearance;
        }

        if (clearance >= minSpacing) {
            return candidate;
        }
    }

    return bestOffset;
}

// Runs the leaf-choice cutscene without changing the viewport.
function leafScene({
    leaf,
    player,
    app,
    viewport,
    eatTex,
    grabTex,
    glowTex,
    ticker,
    moveBeforeScene,
    onEat,
    onGrab,
}) {
    player.move = false;
    player.setTarget(leaf.x+100, leaf.y-150);

    const leafGlow = new Sprite(glowTex)
    leafGlow.anchor.set(0.5)
    leaf.addChild(leafGlow);
    leafGlow.scale.set(5);
    leafGlow.alpha=0.5;
    //leafGlow.blendMode('screen');

    const start = { x: leaf.x + 100, y: leaf.y - 150 };
    const buttons = [
        { sprite: new Sprite(eatTex), action: 'eat', x: leaf.x - 200, y: leaf.y, hovered: false },
        { sprite: new Sprite(grabTex), action: 'grab', x: leaf.x + 200, y: leaf.y, hovered: false },
    ];

    for (const button of buttons) {
        button.sprite.anchor.set(0.5);
        button.sprite.position.set(start.x, start.y);
        button.sprite.alpha = 0;
        button.sprite.eventMode = 'static';
        button.sprite.cursor = 'pointer';

        button.sprite.on('pointerover', () => {
            button.hovered = true;
        });

        button.sprite.on('pointerout', () => {
            button.hovered = false;
        });

        button.sprite.on('pointerdown', (event) => {
            event.stopPropagation();
            if (selectedAction) return;

            selectedAction = button.action;
            glowFadeStartAlpha = leafGlow.alpha;
            buttons.forEach((choice) => {
                choice.fadeStartAlpha = choice.sprite.alpha;
                choice.sprite.eventMode = 'none';
            });
        });

        viewport.addChild(button.sprite);
    }

    let elapsed = 0;
    let fadeElapsed = 0;
    let selectedAction = null;
    let glowFadeStartAlpha = leafGlow.alpha;
    const duration = 600;
    const fadeDuration = 250;

    const updateChoices = (ticker) => {
        const hoverEase = 1 - Math.exp(-14 * ticker.deltaMS / 1000);

        if (selectedAction) {
            fadeElapsed = Math.min(fadeElapsed + ticker.deltaMS, fadeDuration);
            const fadeProgress = fadeElapsed / fadeDuration;

            leafGlow.alpha = glowFadeStartAlpha * (1 - fadeProgress);
            buttons.forEach((button) => {
                button.sprite.alpha = button.fadeStartAlpha * (1 - fadeProgress);
            });

            if (fadeProgress >= 1) {
                ticker.remove(updateChoices);
                buttons.forEach(({ sprite }) => sprite.removeFromParent());
                leafGlow.removeFromParent();
                leafGlow.destroy();

                player.move = moveBeforeScene;

                if (selectedAction === 'eat') {
                    onEat();
                } else {
                    onGrab();
                }
            }

            return;
        }

        // Ease the buttons in from the player position and apply hover scaling.
        elapsed = Math.min(elapsed + ticker.deltaMS, duration);
        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3);

        buttons.forEach((button) => {
            const { sprite } = button;

            sprite.position.set(
                start.x + (button.x - start.x) * eased,
                start.y + (button.y - start.y) * eased,
            );
            sprite.alpha = eased;

            const targetScale = button.hovered ? 1.08 : 1;
            sprite.scale.set(
                sprite.scale.x + (targetScale - sprite.scale.x) * hoverEase,
            );
        });
    };

    ticker.add(updateChoices);
}


// Shrinks and wobbles an eaten leaf, then lets the caller remove it.
function eatLeaf(leaf, ticker, onComplete) {
    const baseScaleX = leaf.scale.x;
    const baseScaleY = leaf.scale.y;
    const stages = [
        { factor: 0.7, duration: 180 },
        { factor: 0.7, duration: 100 },
        { factor: 0.4, duration: 180 },
        { factor: 0.4, duration: 100 },
        { factor: 0, duration: 220 },
    ];

    let stageIndex = 0;
    let elapsed = 0;
    let fromFactor = 1;
    let wobbleTime = 0;
    const baseRotation = leaf.rotation;

    function tick(time) {
        const stage = stages[stageIndex];
        elapsed += time.deltaMS;
        wobbleTime += time.deltaMS;

        const progress = Math.min(elapsed / stage.duration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const factor = fromFactor + (stage.factor - fromFactor) * eased;

        leaf.scale.set(baseScaleX * factor, baseScaleY * factor);
        leaf.rotation = baseRotation + Math.sin(wobbleTime / 40) * 0.3 * (1 - factor);

        if (progress === 1) {
            stageIndex += 1;
            elapsed = 0;
            fromFactor = stage.factor;

            if (stageIndex === stages.length) {
                ticker.remove(tick);
                onComplete();
            }
        }
    }

    ticker.add(tick);
}