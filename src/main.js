import { Application, Assets, Container, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { initDevtools } from '@pixi/devtools';
import { spawn } from './movement.js';
import { createLeaf } from './modules.js';
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
        leafTex,

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
        Assets.load(new URL('../.assets/sprites/FG_trunk5.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/skybox.jpg', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/leaf.png', import.meta.url).href),
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
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

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

     
    viewport.zoom(-200);

    const guide = new Container()
    viewport.addChild(guide);
    guide.position.set(1000,1600)
    viewport.follow(guide, { speed: 2, radius: 100, acceleration: 0.1 });


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
  
    //////////////////////////////////////WORLD CONSTRUCTION ///------------------------
    
    const midground = new Container(); //--------------------------------------------------midground
    viewport.addChild(midground);
    midground.zIndex = -1;

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
    
const leafPositions = [  // ------------------------ moss amount and positions. moss spawn is handled on player spawn.
    [1590, 1000],
    [2000, 1800],
    [2300, 1900],
    [1200, 2500],
    [1800, 4200],
    [900, 6000],
];
    

    const masks = new Container();  //-------------------- intro mask choices
    midground.addChild(masks);

    const mask1 = new Sprite(bunMaskTexture);
        mask1.anchor.set(0.5,0.5)
        mask1.position.set(1150,1720);
        mask1.rotation = Math.PI / 9;
    masks.addChild(mask1)

    const mask2 = new Sprite(catMaskTexture);
        mask2.anchor.set(0.5,0.5)
        mask2.position.set(1260,1745);
        mask2.rotation = Math.PI / 9;
    masks.addChild(mask2)

    const mask3 = new Sprite(owlMaskTexture);
        mask3.anchor.set(0.5,0.5)
        mask3.position.set(1370,1770);
        mask3.rotation = -Math.PI / 9;
    masks.addChild(mask3)

    for (const mask of [mask1, mask2, mask3]) { // --------- mask selection
    const baseRotation = mask.rotation;
    let hovered = false;

    mask.eventMode = 'static';
    mask.cursor = 'pointer';

    mask.on('pointerover', () => { hovered = true; });
    mask.on('pointerout', () => { hovered = false; });

    app.ticker.add((ticker) => {
        const target = baseRotation + (hovered ? 0.1 : 0);
        const ease = 1 - Math.exp(-12 * ticker.deltaMS / 1000);

        mask.rotation += (target - mask.rotation) * ease;
    });
    
}



    /////////////////////////////////////////////////////////////////////////////////////

    const foreground = new Container(); //--------------------------------------------------foreround
    foreground.zIndex = 1;
    foreground.eventMode = 'none';
    viewport.addChild(foreground);

    const trunk1 = new Sprite(trunk1Tex);
        trunk1.anchor.set(1,1);
        trunk1.scale.set (-1);
        trunk1.position.set(0,1700);
    foreground.addChild(trunk1);
    
    /////////////////////////////////////////////////////////////////////////////////////

    const background = new Container(); //--------------------------------------------------background
    background.zIndex = -2;
    viewport.addChild(background);

    const bgtr1 = new Sprite(treeTex);
        bgtr1.label = 'Background Tree';
        bgtr1.anchor.set(0.5, 1);
        bgtr1.scale.set(1.4);
        //tree3.rotation = Math.PI / 5;
        bgtr1.position.set(1000, 3000);
        bgtr1.alpha = 0.3;
    background.addChild(bgtr1);

        
    const logo = new Container(); /// ------- LOGO
    background.addChild(logo);

        logo.position.set(700,450)
        logo.scale.set(0.7)

    const C1 = new Sprite(C1Tex);
        C1.anchor.set(0.5,0.5)
        C1.scale.set(0.7)

    const C2 = new Sprite(C2Tex);
        C2.anchor.set(0.5,0.5)
        C2.rotation = 180
        C2.scale.set(0.5)

    const C3 = new Sprite(C3Tex);
        C3.anchor.set(0.5,0.5)

    app.ticker.add((time) => {
        C1.rotation -= 0.01 * time.deltaTime;
        C2.rotation -= -0.01 * time.deltaTime;
        C3.rotation -= 0.01 * time.deltaTime;
  });

    logo.addChild(C1,C2,C3);


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

////////////////////////////////////////////
///////////// PLAYER SPAWNING /////////////////////////////////////////////////----------------- player starts
////////////////////////////////////////////
let player = null;

function chooseMask(maskName) {
    if (player) return;

    player = new spawn({
        app,
        textures,
        seg: 3,
        mask: maskName,
        move: true,
        color: 'player',
        x: 1000,
        y: 1700,
    });

    viewport.addChild(player.container);
    viewport.follow(player.container, { speed: 5, radius: 100, acceleration: 0.1 });
    masks.visible = false; // Hide the choices after selection

    app.ticker.add((ticker) => {
                    player.update(ticker.deltaMS);
                });

    for (const [x, y] of leafPositions) {
    createLeaf({
        texture: leafTex,
        parent: midground,
        ticker: app.ticker,
        player,
        x,
        y,
        });
    }

}

for (const [maskSprite, maskName] of [
    [mask1, 'bun'],
    [mask2, 'cat'],
    [mask3, 'owl'],
]) {
    maskSprite.on('pointerdown', (event) => {
        event.stopPropagation();
        chooseMask(maskName);
    });
}

   //////////////////////////////////////////////////////////////////////////////////////
    
    const NpcOwl = new spawn({
        app,
        textures,
        seg: 3,
        mask: 'owl',
        move: true,
        color: 'npc',
        x: 1300,
        y: 3000,
    });

    viewport.addChild(NpcOwl.container);
    app.ticker.add((ticker) => {
                    
                    NpcOwl.update(ticker.deltaMS);
                });

    
//////////////////////////////////////////////////////////////////////////////////////////

        window.addEventListener('pointermove', (event) => {
        if (!player) return;

        const bounds = app.canvas.getBoundingClientRect();
        const screenX = (event.clientX - bounds.left) * app.screen.width / bounds.width;
        const screenY = (event.clientY - bounds.top) * app.screen.height / bounds.height;
        const worldPosition = viewport.toLocal({ x: screenX, y: screenY });

        player.setCursorPosition(worldPosition.x, worldPosition.y);
        NpcOwl.setCursorPosition(worldPosition.x, worldPosition.y);
    });

    app.stage.on('pointerdown', (event) => {
        if (!player || event.button !== 0) return;

        const worldPosition = viewport.toLocal(event.global);
        player.startDrag(worldPosition.x, worldPosition.y);
    });

    app.stage.on('globalpointermove', (event) => {
        if (!player) return;

        const worldPosition = viewport.toLocal(event.global);
        player.dragTo(worldPosition.x, worldPosition.y);
    });

    app.stage.on('pointerup', () => player?.stopDrag());
    app.stage.on('pointerupoutside', () => player?.stopDrag());
    app.stage.on('pointercancel', () => player?.stopDrag());



///////////////////////////



})();

