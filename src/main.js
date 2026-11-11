import { Application, Assets, Container, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { initDevtools } from '@pixi/devtools';
import { spawn } from './movement.js';
import { AdvancedBloomFilter } from 'pixi-filters';


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
    

    // Preload.
    const [
        catMaskTexture,
        bunMaskTexture,
        owlMaskTexture,
        dogMaskTexture,
        hamMaskTexture,


        playerHeadTexture,
        playerSegmentTexture,
        npcHeadTexture,
        npcSegmentTexture,

        vigTex,
        C1Tex,
        C2Tex,
        C3Tex,

        treeTex,
        tree2Tex,
        tree3Tex,
        trunk1Tex,
        trunk2Tex,
        trunk3Tex,
        trunk4Tex,
        trunk5Tex,

        skyTex,

    ] = await Promise.all([
        Assets.load(new URL('../.assets/sprites/h_cat.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_bun.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_owl.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_dog.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/h_ham.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/p_head.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/p_seg.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/n_head.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/n_seg.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/vignette.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/C_1.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/C-2.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/C-3.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/bg_tree1.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/bg_tree2.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/bg_tree3.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/fg_trunk1.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/fg_trunk2.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/fg_trunk3.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/fg_trunk4.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/fg_trunk5.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/skybox.jpg', import.meta.url).href),
    ]);

    const textures = {
        masks: {
            cat: catMaskTexture,
            bun: bunMaskTexture,
            owl: owlMaskTexture,
            dog: dogMaskTexture,
            ham: hamMaskTexture,
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
        worldWidth: 3000,
        worldHeight: 8000,
        events: app.renderer.events,
        ticker: app.ticker,
    });


    app.stage.addChild(viewport);
    viewport.clamp({ direction: 'all', underflow: 'center' });
    
    viewport.cullableChildren = true;
    app.renderer.on('resize', (width, height) => viewport.resize(width, height));
    
    viewport.zoom(+700);

    viewport.wheel(); //// DEBUG ONLY
    
    viewport.filters = new AdvancedBloomFilter({ bloomScale:0.2, brightness:1});

    const vig = new Sprite(vigTex);
    vig.zIndex = 0;
    vig.eventMode = 'none';

    const resizeVignette = (width, height) => {
        vig.width = width;
        vig.height = height;
    };

    resizeVignette(app.screen.width, app.screen.height);
    app.renderer.on('resize', resizeVignette);

    app.stage.addChild(vig);

    ///////////////////// World construction///////////////////////////-----------------------------------------------------------


    ////////////////////////////////////// START SCREEN ///------------------
    const C1 = new Sprite(C1Tex);
    C1.anchor.set(0.5,0.5)
    C1.x = app.screen.width / 2;
    C1.y = 200;
    C1.scale.set(0.7)

    const C2 = new Sprite(C2Tex);
    C2.anchor.set(0.5,0.5)
    C2.x = app.screen.width / 2;
    C2.y = 200;
    C2.rotation = 180
    C2.scale.set(0.5)

    const C3 = new Sprite(C3Tex);
    C3.anchor.set(0.5,0.5)
    C3.x = app.screen.width / 2;
    C3.y = 200;

    app.ticker.add((time) => {
    C1.rotation -= 0.01 * time.deltaTime;
    C2.rotation -= -0.01 * time.deltaTime;
    C3.rotation -= 0.01 * time.deltaTime;
  });

    viewport.addChild(C1,C2,C3);



    ///////////////////////////////////// START SCREEN END ///---------------
    //////////
    //////////////////////////////////////WORLD CONSTRUCTION ///------------------------
    
    const midground = new Container(); //--------------------------------------------------midground
    viewport.addChild(midground);


    const tree = new Sprite(tree3Tex);
        tree.label = 'birthtree';
        tree.anchor.set(0.5, 1);
        tree.scale.set(1);
        tree.position.set(2000, 2600);
        tree.zIndex = -1;
    midground.addChild(tree);

    const tree2 = new Sprite(tree2Tex);
        tree2.label = 'Background Tree';
        tree2.anchor.set(0.5, 1);
        tree2.scale.set(0.9);
        tree2.rotation = Math.PI / 5;
        tree2.position.set(0, 3900);
        tree2.zIndex = -1;
    midground.addChild(tree2);

    const tree3 = new Sprite(tree3Tex);
        tree3.label = 'Background Tree';
        tree3.anchor.set(0.5, 1);
        //tree3.rotation = Math.PI / 5;
        tree3.scale.set(1.3);
        tree3.position.set(2000, 7000);
        tree3.zIndex = -1;
    midground.addChild(tree3);


    /////////////////////////////////////////////////////////////////////////////////////

    const foreground = new Container(); //--------------------------------------------------foreround
    foreground.zIndex = 1;
    viewport.addChild(foreground);

    const trunk1 = new Sprite(trunk1Tex);
        trunk1.anchor.set(1,1);
        trunk1.scale.set (-1);
        trunk1.position.set(0,1700);
    foreground.addChild(trunk1);
    
    /////////////////////////////////////////////////////////////////////////////////////

    const background = new Container(); //--------------------------------------------------background
    background.zIndex = -2;
    background.alpha = 0.3;
    viewport.addChild(background);

    const bgtr1 = new Sprite(treeTex);
        bgtr1.label = 'Background Tree';
        bgtr1.anchor.set(0.5, 1);
        bgtr1.scale.set(1.4);
        //tree3.rotation = Math.PI / 5;
        bgtr1.position.set(1000, 3000);
        bgtr1.zIndex = -1;
    background.addChild(bgtr1);

    /////////////////////////////////////////////////////////////////////////////////////

    const skybox = new Container(); //------------------------------------------------------skybox
    skybox.zIndex = -4
    viewport.addChild(skybox);

    const sky = new Sprite(skyTex);
    sky.scale.set(1.5);
    skybox.addChild(sky);

    //////// PARALLAX SETUP /////////-----------------------------------------------------------------------------------------
    
    const start = { left: viewport.left, top: viewport.top };

    viewport.on('moved', () => {
        const dx = viewport.left - start.left;
        const dy = viewport.top - start.top;

        skybox.position.set(dx * (1 - 0.05), dy * (1 - 0.05))
        background.position.set(dx * (1 - 0.25), dy * (1 - 0.25)); // slower
        foreground.position.set(dx * (1 - 1.2), dy * (1 - 1.2));  // faster
});


   // DEBUG // Player spawn settings. ------------------------------------------------------------------------------------------
    const player = new spawn({
        app,
        textures,
        seg: 9,
        mask: 'bun',
        move: true,
        color: 'player',
        x: app.screen.width / 2,
        y: app.screen.width / 2,
    });

    
    const NpcOwl = new spawn({
        app,
        textures,
        seg: 3,
        mask: 'owl',
        move: true,
        color: 'npc',
        x: 1300,
        y: 2000,
    });

    viewport.addChild(NpcOwl.container);

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

    window.addEventListener('pointermove', (event) => {
        const canvasBounds = app.canvas.getBoundingClientRect();
        const screenX = (event.clientX - canvasBounds.left)
            * app.screen.width / canvasBounds.width;
        const screenY = (event.clientY - canvasBounds.top)
            * app.screen.height / canvasBounds.height;
        const worldPosition = viewport.toLocal({ x: screenX, y: screenY });
        NpcOwl.setCursorPosition(worldPosition.x, worldPosition.y);
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
        NpcOwl.update(ticker.deltaMS);
    });
})();







const bubbleLayer = new Container();
viewport.addChild(bubbleLayer); // Add after your world objects.

const bubble = new SpeechBubble(bubbleTexture);
bubbleLayer.addChild(bubble);

bubble.show(npcSprite, 'Hello there!');

app.ticker.add(() => {
  bubble.update(bubbleLayer);
});

// When the dialogue ends:
bubble.hide();