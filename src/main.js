import { Application, Assets, BlurFilter, Container, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { initDevtools } from '@pixi/devtools';
import { spawn } from './movement.js';
import { createLeaf, feedNearbyNpc } from './modules.js';
import { dialogueTrees, NpcDialogueManager } from './dialogue.js';
import { AdvancedBloomFilter } from 'pixi-filters';


(async () => {
    // Create the PixiJS app before loading and adding game objects.
    const app = new Application();

    await app.init({
        resizeTo: window,
        backgroundColor: 'gray',
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
        CTex,
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

        glowTex,
        eatTex,
        grabTex,

        yesTex,
        noTex,
        foodGlowTex,
        friendTex,
        friendWhatTex,
        whatTex,
        foodWhatTex,
        redWhatTex,
        sadTex,

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
        Assets.load(new URL('../.assets/sprites/C.png', import.meta.url).href),
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

        Assets.load(new URL('../.assets/sprites/bloom.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/eat.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/grab.png', import.meta.url).href),

        Assets.load(new URL('../.assets/sprites/yes.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/no.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/food-glow.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/friend.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/friend-what.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/what.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/food-what.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/red-what.png', import.meta.url).href),
        Assets.load(new URL('../.assets/sprites/sad.png', import.meta.url).href),

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

    ////// guide Null for adjusting viewport manually /////
    const guide = new Container()
    viewport.addChild(guide);
    guide.position.set(1260,1650)
    viewport.follow(guide, { speed: 3, radius: 100, acceleration: 0.5 });


    viewport.wheel(); //// DEBUG ONLY
    
    //viewport.filters = new AdvancedBloomFilter({ bloomScale:0.5, brightness:1});

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

    const tree5 = new Sprite(tree3Tex);
        tree5.label = 'Background Tree';
        tree5.anchor.set(0);
        tree5.scale.set(-1,1);
        tree5.position.set(2000, 6100);
        tree5.zIndex = -1;
    midground.addChild(tree5);

    
const leafPositions = [  // Leaf positions; spawning is triggered by NPC dialogue.
    [1590, 1000],
    [2000, 1800],
    [2300, 1900],
    [2820, 2356],
    [1120, 2600],
    [520, 3300],
    [50,3000],
    [30,2930],
    [990,4390],
    [1540,5350],
];

function spawnLeaves() {
    for (const [x, y] of leafPositions) {
    createLeaf({
        texture: leafTex,
        parent: midground,
        ticker: app.ticker,
        player,
        app,
        viewport,
        eatTex: eatTex,
        grabTex: grabTex,
        glowTex,
        x,
        y,
    });
    }
}

    

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

    const maskGlows = [];

    for (const mask of [mask1, mask2, mask3]) { // --------- mask selection
    const baseRotation = mask.rotation;
    let hovered = false;

    mask.eventMode = 'static';
    mask.cursor = 'pointer';

    const glow = new Sprite(glowTex);
        glow.anchor.copyFrom(mask.anchor);
        glow.position.copyFrom(mask.position);
        glow.scale.set(1.5)
        glow.rotation = mask.rotation;
        glow.alpha= 0.1;

        masks.addChildAt(glow, masks.getChildIndex(mask));
        maskGlows.push(glow);

    mask.on('pointerover', () => { hovered = true; });
    mask.on('pointerout', () => { hovered = false; });

    app.ticker.add((ticker) => {
        if (mask.eventMode === 'none') return;

        const target = baseRotation + (hovered ? 0.1 : 0);
        const ease = 1 - Math.exp(-12 * ticker.deltaMS / 1000);
        mask.rotation += (target - mask.rotation) * ease;
        glow.rotation = mask.rotation;

        const targetGlowScale = hovered ? 2 : 1.5;
        glow.scale.set(
        glow.scale.x + (targetGlowScale - glow.scale.x) * ease,);

        const targetAlpha = hovered ? 0.5 : 0.3;
        glow.alpha= glow.alpha + (targetAlpha - glow.alpha) * ease;
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

    const trunk2 = new Sprite(trunk3Tex);
        trunk2.anchor.set(1,1);
        trunk2.scale.set(-0.4,0.4);
        trunk2.position.set(0,1700);
    foreground.addChild(trunk2);

    const trunk3 = new Sprite(trunk2Tex);
        trunk3.anchor.set(1,1);
        trunk3.scale.set(1);
        trunk3.position.set(3500,5000);
    foreground.addChild(trunk3);

    const trunk4 = new Sprite(tree2Tex);
        trunk4.anchor.set(0,1);
        trunk4.scale.set(-0.6,0.6);
        trunk4.position.set(3500,7000);
    foreground.addChild(trunk4);

    const tree4 = new Sprite(tree2Tex);
        tree4.label = 'Background Tree';
        tree4.anchor.set(0.5, 1);
        //tree3.rotation = Math.PI / 5;
        tree4.scale.set(1);
        tree4.position.set(2000, 9500);
        tree4.zIndex = -1;
    foreground.addChild(tree4); 
    
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
    app.stage.addChild(logo);

    const logoSlideDistance = 100;
    let logoOffsetY = -logoSlideDistance;

    const centerLogo = () => {
        logo.position.set(app.screen.width / 2, app.screen.height / 7 + logoOffsetY);
    };

    centerLogo();
    app.renderer.on('resize', centerLogo);
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

    const C = new Sprite(CTex);
        C.anchor.set(0.5,0.5)
        C.scale.set(1.2)
        C.position.set(0,200)

    app.ticker.add((time) => {
        C1.rotation -= 0.01 * time.deltaTime;
        C2.rotation -= -0.01 * time.deltaTime;
        C3.rotation -= 0.01 * time.deltaTime;
  });

    logo.addChild(C1,C2,C3,C);
    const logoBlur = new BlurFilter({ strength: 10 });
    logo.filters = logoBlur

    logo.alpha = 0;

    let logoAnimation;

    function animateLogo(show) {
        if (logoAnimation) app.ticker.remove(logoAnimation);

        logo.visible = true;

        const duration = show ? 5000 : 450;
        const startAlpha = logo.alpha;
        const startOffsetY = logoOffsetY;
        const startBlur = logoBlur.strength;
        const endAlpha = show ? 1 : 0;
        const endOffsetY = show ? 0 : -logoSlideDistance;
        const endBlur = show ? 0 : 10;
        let elapsed = 0;

        logoAnimation = (ticker) => {
            elapsed = Math.min(elapsed + ticker.deltaMS, duration);
            const t = elapsed / duration;
            const eased = show ? 1 - Math.pow(1 - t, 3) : Math.pow(t, 3);

            logo.alpha = startAlpha + (endAlpha - startAlpha) * eased;
            logoOffsetY = startOffsetY + (endOffsetY - startOffsetY) * eased;
            logo.y = app.screen.height / 7 + logoOffsetY;
            logoBlur.strength = startBlur + (endBlur - startBlur) * eased;
            C.y = 170 + startOffsetY + (endOffsetY - startOffsetY) * eased;

            if (t >= 1) {
                app.ticker.remove(logoAnimation);
                if (!show) logo.visible = false;
            }
        };

        app.ticker.add(logoAnimation);
    }

    animateLogo(true);


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

function chooseMask(maskName, maskSprite) {
    if (player) return;

    const start = viewport.toLocal(maskSprite.getGlobalPosition());
    const destination = { x: start.x, y: start.y - 600 }; // Pixi's y increases downward

    player = new spawn({
        app,
        textures,
        seg: 3,
        mask: maskName,
        move: true,
        color: 'player',
        x: start.x,
        y: start.y,
    });

        viewport.addChild(player.container);
    player.setTarget(destination.x, destination.y);
    viewport.follow(player.container, { speed: 5, radius: 100, acceleration: 0.1 });
    viewport.snapZoom({
        width: viewport.screenWidth + 700,
        time: 1500, // duration in ms
        ease: 'easeInOutQuad', // easing name or custom easing function
        center: viewport.center, 
        removeOnComplete: true, // clean up plugin once finished
    });

    animateMaskExit(maskSprite);
    animateLogo(false);

    app.ticker.add((ticker) => {
                    player.update(ticker.deltaMS);
                });



}
////animates masks falling////
function animateMaskExit(selectedMask) {
    const choices = [mask1, mask2, mask3];
    const fallers = choices
        .filter((mask) => mask !== selectedMask)
        .map((sprite) => ({
            sprite,
            velocityX: Math.sign(sprite.x - selectedMask.x) * 140,
            velocityY: 0,
            rotationSpeed: Math.sign(sprite.x - selectedMask.x) * 2,
        }));

    const startScaleX = selectedMask.scale.x;
    const startScaleY = selectedMask.scale.y;
    let elapsed = 0;

    for (const mask of choices) {
        mask.eventMode = 'none';
    }
    const glowStartAlphas = maskGlows.map((glow) => glow.alpha);

    const update = (ticker) => {
        const dt = ticker.deltaMS / 1000;
        elapsed += dt;

        const disappearProgress = Math.min(elapsed / 0.3, 1);

        maskGlows.forEach((glow, index) => {
            glow.alpha = glowStartAlphas[index] * (1 - disappearProgress);
        });

        selectedMask.alpha = 1 - disappearProgress;
        selectedMask.scale.set(
            startScaleX * (1 - disappearProgress),
            startScaleY * (1 - disappearProgress),
        );

        for (const faller of fallers) {
            faller.velocityY += 900 * dt;
            faller.sprite.x += faller.velocityX * dt;
            faller.sprite.y += faller.velocityY * dt;
            faller.sprite.rotation += faller.rotationSpeed * dt;
            faller.sprite.alpha = Math.max(0, 1 - Math.max(0, elapsed - 0.8) / 0.5);
        }

        if (elapsed >= 1.3) {
            app.ticker.remove(update);
            midground.removeChild(masks);
        }
    };

    app.ticker.add(update);
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

for (const [maskSprite, maskName] of [
    [mask1, 'bun'],
    [mask2, 'cat'],
    [mask3, 'owl'],
]) {
    maskSprite.on('pointerdown', (event) => {
        event.stopPropagation();
        chooseMask(maskName, maskSprite);
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

    const NpcDog = new spawn({
        app,
        textures,
        seg: 2,
        mask: 'dog',
        move: true,
        color: 'npc',
        x: 2000,
        y: 5000,
    });

    const NpcBun = new spawn({
        app,
        textures,
        seg: 5,
        mask: 'bun',
        move: true,
        color: 'npc',
        x: 1300,
        y: 7000,
    });

    viewport.addChild(NpcOwl.container);
    viewport.addChild(NpcDog.container);
    viewport.addChild(NpcBun.container);

    const dialogueManager = new NpcDialogueManager({
        screen: app.screen,
        stage: app.stage,
        viewport,
        ticker: app.ticker,
        getPlayer: () => player,
        icons: {
            eat: eatTex,
            grab: grabTex,
            yes: yesTex,
            no: noTex,
            foodGlow: foodGlowTex,
            friend: friendTex,
            friendWhat: friendWhatTex,
            what: whatTex,
            foodWhat: foodWhatTex,
            redWhat: redWhatTex,
            leafGlow: foodGlowTex,
            sad: sadTex,
        },
        onFeed: (currentPlayer, npc) => feedNearbyNpc({
            player: currentPlayer,
            npc,
            ticker: app.ticker,
        }),
        onSpawnLeaves: () => spawnLeaves(),
        answerSpacing: 300,
        answerBottomOffset: 200,
    });

    dialogueManager.registerNpc('owl', NpcOwl, dialogueTrees.owl);
    dialogueManager.registerNpc('dog', NpcDog, dialogueTrees.dog);
    dialogueManager.registerNpc('bun', NpcBun, dialogueTrees.bun);

    app.ticker.add((ticker) => {
                    
                    NpcOwl.update(ticker.deltaMS);
                    NpcDog.update(ticker.deltaMS);
                    NpcBun.update(ticker.deltaMS);
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
        NpcDog.setCursorPosition(worldPosition.x, worldPosition.y);
        NpcBun.setCursorPosition(worldPosition.x, worldPosition.y);
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

