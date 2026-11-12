
import { Sprite } from 'pixi.js';

export function createLeaf({ texture, parent, ticker, player, x, y }) {
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

    leaf.on('pointerdown', (event) => {
        event.stopPropagation();
        if (eaten) {
            return;
        }

        eaten = true;
        player.addSegment();
        eatLeaf(leaf, ticker, () => {
            ticker.remove(updateTint);
            parent.removeChild(leaf);
            leaf.destroy();
        });
    });

    return leaf;
}


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
