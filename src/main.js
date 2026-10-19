import { Application, Assets, Container, Sprite } from 'pixi.js';
import { initDevtools } from '@pixi/devtools';

(async () => {
    // Initialize the PixiJS application and debugging tools.
    const app = new Application();

    await app.init({
        resizeTo: window,
        backgroundColor: 0x808080,
    });

    await initDevtools({ app });

    app.canvas.style.position = 'absolute';
    document.body.appendChild(app.canvas);

    // DEBUG variables
    const p_segments = 2;



    const segmentScaleStep = 1 / (p_segments + 1);
    const maxSegmentDownscale = 0.8;

    // Load the creature textures.
    const maskTexture = await Assets.load(new URL('../.assets/sprites/h_cat.png', import.meta.url).href);
    const headTexture = await Assets.load(new URL('../.assets/sprites/p_head.png', import.meta.url).href);
    const segmentTexture = await Assets.load(new URL('../.assets/sprites/g_seg.png', import.meta.url).href);
    const armTexture = await Assets.load(new URL('../.assets/sprites/p_arms.png', import.meta.url).href);

    // Build the player from separately layered sprite parts.
    const player = new Container({
        label: 'Player',
        x: app.screen.width / 2,
        y: app.screen.height / 2,
        sortableChildren: true,
    });
    const face = new Sprite(maskTexture);
    const body = new Sprite(headTexture);
    const segments = Array.from({ length: p_segments }, (_, index) => {
        const segment = new Sprite(segmentTexture);
        segment.label = `Segment ${index + 1}`;
        segment.anchor.set(0.5);
        segment.scale.set(Math.max(1 - index * segmentScaleStep, 1 - maxSegmentDownscale));
        segment.zIndex = 800 - index;
        return segment;
    });

    face.label = 'Face';
    face.zIndex = 1000;
    body.label = 'Body';
    body.zIndex = 900;

    face.anchor.set(0.5);
    body.anchor.set(0.5);

    player.addChild(...segments, body, face);
    app.stage.addChild(player);

    // Configure the trail and spacing used to position each body part.
    const chainParts = [body, ...segments];
    const chainSpacing = Math.min(
        face.texture.width,
        body.texture.width,
        ...segments.map((segment) => segment.texture.width),
    ) * 0.6;
    const segmentSpacingFactor = 0.9;
    const baseChainOffset = 0.5;
    const maxChainOffset = 1;
    const maxSegmentSpacingFactor = segmentSpacingFactor + maxChainOffset - baseChainOffset;
    const chainLength = chainSpacing * maxChainOffset
        + segments.reduce((length, segment) => length + chainSpacing * segment.scale.x * maxSegmentSpacingFactor, 0);
    const trail = [];
    const trailSampleSpacing = 8;
    const startX = player.x;
    const startY = player.y;

    let distanceTraveled = 0;
    let targetX = player.x;
    let targetY = player.y;
    let cursorX = player.x;
    let cursorY = player.y;
    let idleCenterX = player.x;
    let idleCenterY = player.y;
    const idleRadius = 80;
    const maxFaceSkew = 0.2;
    const maxTurnRate = Math.PI * 0.75;

    const idleWaveAmplitude = 8;
    const idleWaveFrequency = 2.5;
    const idleWavePhaseOffset = 0.7;

    const accelerationForMaxStretch = 5000;
    let heading = 0;
    let idleWaveTime = 0;
    let chainOffset = baseChainOffset;
    let previousVelocityX = 0;
    let previousVelocityY = 0;

    // Track the cursor in canvas coordinates for idle movement and face skew.
    window.addEventListener('pointermove', (event) => {
        const canvasBounds = app.canvas.getBoundingClientRect();
        cursorX = (event.clientX - canvasBounds.left) * app.screen.width / canvasBounds.width;
        cursorY = (event.clientY - canvasBounds.top) * app.screen.height / canvasBounds.height;
    });

    // Seed the trail behind the player so the chain has initial positions.
    for (let distance = -chainLength; distance < 0; distance += trailSampleSpacing) {
        trail.push({ x: startX + distance, y: startY, distance });
    }
    trail.push({ x: startX, y: startY, distance: 0 });

    // Store each part's progress along the trail; this prevents spacing changes
    // from moving a segment backward through a turn.
    const partTrailDistances = [];
    let initialPartDistance = 0;
    chainParts.forEach((_, index) => {
        if (index === 0) {
            initialPartDistance -= chainSpacing * baseChainOffset;
        } else {
            initialPartDistance -= chainSpacing * segments[index - 1].scale.x * segmentSpacingFactor;
        }
        partTrailDistances.push(initialPartDistance);
    });

    // Interpolate a world position at a distance along the recorded trail.
    const getTrailPosition = (distance) => {
        if (distance <= trail[0].distance) {
            return trail[0];
        }

        for (let i = 1; i < trail.length; i += 1) {
            const next = trail[i];
            if (next.distance >= distance) {
                const previous = trail[i - 1];
                const progress = (distance - previous.distance) / (next.distance - previous.distance);

                return {
                    x: previous.x + (next.x - previous.x) * progress,
                    y: previous.y + (next.y - previous.y) * progress,
                };
            }
        }

        return trail[trail.length - 1];
    };

    // Place each part behind the part in front of it, respecting its spacing.
    const updateChain = () => {
        chainParts.forEach((part, index) => {
            const spacing = index <= 1
                ? chainSpacing * chainOffset
                : chainSpacing * segments[index - 1].scale.x
                    * (segmentSpacingFactor + chainOffset - baseChainOffset);
            const frontDistance = index === 0 ? distanceTraveled : partTrailDistances[index - 1];
            const partDistance = Math.max(partTrailDistances[index], frontDistance - spacing);
            partTrailDistances[index] = partDistance;

            const position = getTrailPosition(partDistance);
            part.position.set(position.x - player.x, position.y - player.y);
        });
    };

    updateChain();

    // Handle click-and-drag movement and pointer-driven idle behavior.
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    let dragging = false;
    let idleActive = true;

    const stopDragging = () => {
        if (dragging) {
            dragging = false;
        }
    };

    app.stage.on('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        dragging = true;
        idleActive = false;
        cursorX = event.global.x;
        cursorY = event.global.y;
        targetX = event.global.x;
        targetY = event.global.y;
    });
    app.stage.on('globalpointermove', (event) => {
        if (dragging) {
            targetX = event.global.x;
            targetY = event.global.y;
        }
    });
    app.stage.on('pointerup', stopDragging);
    app.stage.on('pointerupoutside', stopDragging);
    app.stage.on('pointercancel', stopDragging);

    // Move the player, update chain elasticity, and ease the face skew.
    app.ticker.add((ticker) => {
        if (!dragging && idleActive) {
            const cursorOffsetX = cursorX - idleCenterX;
            const cursorOffsetY = cursorY - idleCenterY;
            const cursorDistance = Math.hypot(cursorOffsetX, cursorOffsetY);
            const idleScale = cursorDistance > idleRadius ? idleRadius / cursorDistance : 1;

            targetX = idleCenterX + cursorOffsetX * idleScale;
            targetY = idleCenterY + cursorOffsetY * idleScale;
        }

        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distanceToTarget = Math.hypot(dx, dy);
        const deltaSeconds = ticker.deltaMS / 1000;
        let moveX = 0;
        let moveY = 0;

        if (distanceToTarget > 0.5) {
            const targetHeading = Math.atan2(dy, dx);
            const headingDifference = Math.atan2(
                Math.sin(targetHeading - heading),
                Math.cos(targetHeading - heading),
            );
            const maxTurnThisFrame = maxTurnRate * deltaSeconds;
            heading += Math.max(-maxTurnThisFrame, Math.min(maxTurnThisFrame, headingDifference));

            const easing = 1 - Math.exp(-1.5 * ticker.deltaMS / 1000);
            const alignment = Math.max(0.2, Math.cos(headingDifference));
            const stepDistance = distanceToTarget * easing * alignment;
            const nextX = player.x + Math.cos(heading) * stepDistance;
            const nextY = player.y + Math.sin(heading) * stepDistance;

            moveX = nextX - player.x;
            moveY = nextY - player.y;
            player.position.set(nextX, nextY);
            distanceTraveled += Math.hypot(moveX, moveY);
            trail.push({ x: player.x, y: player.y, distance: distanceTraveled });

            const oldestDistance = distanceTraveled - chainLength - trailSampleSpacing;
            while (trail.length > 2 && trail[1].distance < oldestDistance) {
                trail.shift();
            }
        }

        if (!dragging && !idleActive && distanceToTarget <= 0.5) {
            idleCenterX = targetX;
            idleCenterY = targetY;
            idleActive = true;
        }

        if (deltaSeconds > 0) {
            const velocityX = moveX / deltaSeconds;
            const velocityY = moveY / deltaSeconds;
            const acceleration = Math.hypot(
                (velocityX - previousVelocityX) / deltaSeconds,
                (velocityY - previousVelocityY) / deltaSeconds,
            );
            const stretch = Math.min(1, acceleration / accelerationForMaxStretch);
            const targetChainOffset = baseChainOffset + (maxChainOffset - baseChainOffset) * stretch;
            const adjustmentRate = targetChainOffset > chainOffset ? 8 : 2.5;
            const adjustment = 1 - Math.exp(-adjustmentRate * deltaSeconds);

            chainOffset += (targetChainOffset - chainOffset) * adjustment;
            previousVelocityX = velocityX;
            previousVelocityY = velocityY;
        }
        updateChain();

        idleWaveTime += deltaSeconds;

        segments.forEach((segment, index) => {
            const wavePhase = idleWaveTime * idleWaveFrequency - index * idleWavePhaseOffset;
            const waveOffset = Math.sin(wavePhase) * idleWaveAmplitude;

            segment.x -= Math.sin(heading) * waveOffset;
            segment.y += Math.cos(heading) * waveOffset;
        });

        const cursorDX = cursorX - player.x;
        const cursorDY = cursorY - player.y;
        const targetSkewX = Math.max(-maxFaceSkew, Math.min(maxFaceSkew, -cursorDY / (app.screen.height / 2) * maxFaceSkew));
        const targetSkewY = Math.max(-maxFaceSkew, Math.min(maxFaceSkew, cursorDX / (app.screen.width / 2) * maxFaceSkew));
        const skewEase = 1 - Math.exp(-8 * deltaSeconds);

        face.skew.x += (targetSkewX - face.skew.x) * skewEase;
        face.skew.y += (targetSkewY - face.skew.y) * skewEase;
    });
})();