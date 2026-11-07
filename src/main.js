import { Application, Assets, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { initDevtools } from '@pixi/devtools';
import { spawn } from './movement.js';

(async () => {
    // Create the PixiJS app before loading and adding game objects.
    const app = new Application();

    await app.init({
        resizeTo: window,
        backgroundColor: 0x808080,
    });

    await initDevtools({ app });

    app.canvas.style.position = 'absolute';
    document.body.appendChild(app.canvas);

    // Preload every mask and both creature body sets for later player/NPC spawns.
    const [
        catMaskTexture,
        bunMaskTexture,
        owlMaskTexture,
        playerHeadTexture,
        playerSegmentTexture,
        npcHeadTexture,
        npcSegmentTexture,
        treeTexture,
    ] = await Promise.all([
        Assets.load(new URL('../.assets/sprites/h_cat.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_bun.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_owl.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/p_head.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/p_seg.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/n_head.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/n_seg.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/bg_tree1.png', import.meta.url).href),
    ]);

    const textures = {
        masks: {
            cat: catMaskTexture,
            bun: bunMaskTexture,
            owl: owlMaskTexture,
        },
        player: {
            head: playerHeadTexture,
            segment: playerSegmentTexture,
        },
        npc: {
            head: npcHeadTexture,
            segment: npcSegmentTexture,
        },
    };


    // ---- APP STARTS ----- //

    const viewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
        worldWidth: 4000,
        worldHeight: 4000,
        events: app.renderer.events,
        ticker: app.ticker,
    });


    app.stage.addChild(viewport);
    viewport.clamp({ direction: 'all', underflow: 'center' });
    app.renderer.on('resize', (width, height) => viewport.resize(width, height));
    viewport.wheel();
    

    // Player spawn settings: edit these values to configure the prototype player.
    const player = new spawn({
        app,
        textures,
        seg: 8,
        mask: 'bun',
        move: true,
        color: 'player',
        x: app.screen.width / 2,
        y: app.screen.height / 2,
    });

    // Place a background tree near the player in world space.
    const tree = new Sprite(treeTexture);
    tree.label = 'Background Tree';
    tree.anchor.set(0.5, 1);
    tree.scale.set(1);
    tree.position.set(2000, 4000);
    tree.zIndex = -1;
    viewport.addChild(tree);
    

    viewport.addChild(player.container);
    viewport.follow(player.container, { speed: 5, radius: 100, acceleration: 0.1 });

    



    // Convert browser pointer coordinates to canvas coordinates for idle face tracking.
    window.addEventListener('pointermove', (event) => {
        const canvasBounds = app.canvas.getBoundingClientRect();
        const screenX = (event.clientX - canvasBounds.left)
            * app.screen.width / canvasBounds.width;
        const screenY = (event.clientY - canvasBounds.top)
            * app.screen.height / canvasBounds.height;
        const worldPosition = viewport.toLocal({ x: screenX, y: screenY });
        player.setCursorPosition(worldPosition.x, worldPosition.y);
    });

    // Keep pointer input in main so the same spawn class can also be driven by game code.
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (event) => {
        if (event.button === 0) {
            const worldPosition = viewport.toLocal(event.global);
            player.startDrag(worldPosition.x, worldPosition.y);
        }
    });
    app.stage.on('globalpointermove', (event) => {
        const worldPosition = viewport.toLocal(event.global);
        player.dragTo(worldPosition.x, worldPosition.y);
    });
    app.stage.on('pointerup', () => player.stopDrag());
    app.stage.on('pointerupoutside', () => player.stopDrag());
    app.stage.on('pointercancel', () => player.stopDrag());

    // Update the creature each frame; scripted movement can call player.setTarget(x, y).
    app.ticker.add((ticker) => {
        player.update(ticker.deltaMS);
    });
})();
