import { Container, Sprite } from 'pixi.js';

// Shared creature visuals and movement. Main/game code supplies input and calls update().
export class spawn {
    // seg, mask, move, and color are the per-creature settings to change when spawning.
    constructor({ app, textures, seg = 3, mask = 'cat', move = true, color = 'player', x, y }) {
        if (!Number.isInteger(seg) || seg < 0) {
            throw new RangeError('Segment count must be a non-negative integer.');
        }

        // Select the player or NPC body textures and the requested face mask.
        const characterTextures = textures[color];
        const maskTexture = textures.masks[mask];
        if (!characterTextures) {
            throw new Error(`Unknown creature color: ${color}`);
        }
        if (!maskTexture) {
            throw new Error(`Unknown creature mask: ${mask}`);
        }

        this.app = app;
        this.seg = seg;
        this.mask = mask;
        this.move = move;
        this.color = color;

        const startX = x ?? app.screen.width / 2;
        const startY = y ?? app.screen.height / 2;
        // Keep all body parts together so the game can add/remove this creature as one object.
        this.container = new Container({
            label: color === 'player' ? 'Player' : 'NPC',
            x: startX,
            y: startY,
            sortableChildren: true,
        });
        this.face = new Sprite(maskTexture);
        this.body = new Sprite(characterTextures.head);
        this.segments = Array.from({ length: seg }, (_, index) => {
            const segment = new Sprite(characterTextures.segment);
            segment.label = `Segment ${index + 1}`;
            segment.anchor.set(0.5);
            segment.scale.set(Math.max(1 - index / (seg + 1), 0.2));
            segment.zIndex = 800 - index;
            return segment;
        });

        this.face.label = 'Face';
        this.face.zIndex = 1000;
        this.body.label = 'Body';
        this.body.zIndex = 900;
        this.face.anchor.set(0.5);
        this.body.anchor.set(0.5);
        this.container.addChild(...this.segments, this.body, this.face);

        // Movement and appearance tuning values.
        this.chainParts = [this.body, ...this.segments];
        this.chainSpacing = Math.min(
            this.face.texture.width,
            this.body.texture.width,
            ...this.segments.map((segment) => segment.texture.width),
        ) * 0.6;
        this.segmentSpacingFactor = 0.9;
        this.baseChainOffset = 0.5;
        this.maxChainOffset = 1;
        this.trailSampleSpacing = 8;
        this.maxFaceSkew = 0.2;
        this.maxTurnRate = Math.PI * 0.75;
        this.idleRadius = 80;
        this.idleWaveAmplitude = 8;
        this.idleWaveFrequency = 2.5;
        this.idleWavePhaseOffset = 0.7;
        this.accelerationForMaxStretch = 5000;

        const maxSegmentSpacingFactor = this.segmentSpacingFactor
            + this.maxChainOffset - this.baseChainOffset;
        this.chainLength = this.chainSpacing * this.maxChainOffset
            + this.segments.reduce(
                (length, segment) => length
                    + this.chainSpacing * segment.scale.x * maxSegmentSpacingFactor,
                0,
            );
        // Track the head's path so each body part can follow the same route.
        this.trail = [];
        this.distanceTraveled = 0;
        this.targetX = startX;
        this.targetY = startY;
        this.cursorX = startX;
        this.cursorY = startY;
        this.idleCenterX = startX;
        this.idleCenterY = startY;
        this.heading = 0;
        this.idleWaveTime = 0;
        this.chainOffset = this.baseChainOffset;
        this.previousVelocityX = 0;
        this.previousVelocityY = 0;
        this.previousMove = move;
        this.dragging = false;
        this.idleActive = true;
        this.cursorTracked = false;

        for (let distance = -this.chainLength; distance < 0; distance += this.trailSampleSpacing) {
            this.trail.push({ x: startX + distance, y: startY, distance });
        }
        this.trail.push({ x: startX, y: startY, distance: 0 });

        // Give each body part a starting location behind the head along the trail.
        this.partTrailDistances = [];
        let initialPartDistance = 0;
        this.chainParts.forEach((_, index) => {
            if (index === 0) {
                initialPartDistance -= this.chainSpacing * this.baseChainOffset;
            } else {
                initialPartDistance -= this.chainSpacing
                    * this.segments[index - 1].scale.x * this.segmentSpacingFactor;
            }
            this.partTrailDistances.push(initialPartDistance);
        });

        this.updateChain();
    }

    setCursorPosition(x, y) {
        this.cursorX = x;
        this.cursorY = y;
        this.cursorTracked = true;
    }

    // Move toward a game-controlled target (for example, an NPC waypoint or cutscene position).
    setTarget(x, y) {
        this.dragging = false;
        this.idleActive = false;
        this.targetX = x;
        this.targetY = y;
        if (!this.cursorTracked) {
            this.cursorX = x;
            this.cursorY = y;
        }
    }

    startDrag(x, y) {
        if (!this.move) {
            return;
        }

        this.setCursorPosition(x, y);
        this.targetX = x;
        this.targetY = y;
        this.dragging = true;
        this.idleActive = false;
    }

    dragTo(x, y) {
        if (!this.move || !this.dragging) {
            return;
        }

        this.targetX = x;
        this.targetY = y;
    }

    stopDrag() {
        this.dragging = false;
    }

    getTrailPosition(distance) {
        if (distance <= this.trail[0].distance) {
            return this.trail[0];
        }

        for (let index = 1; index < this.trail.length; index += 1) {
            const next = this.trail[index];
            if (next.distance >= distance) {
                const previous = this.trail[index - 1];
                const progress = (distance - previous.distance)
                    / (next.distance - previous.distance);

                return {
                    x: previous.x + (next.x - previous.x) * progress,
                    y: previous.y + (next.y - previous.y) * progress,
                };
            }
        }

        return this.trail[this.trail.length - 1];
    }

    updateChain() {
        this.chainParts.forEach((part, index) => {
            const spacing = index <= 1
                ? this.chainSpacing * this.chainOffset
                : this.chainSpacing * this.segments[index - 1].scale.x
                    * (this.segmentSpacingFactor + this.chainOffset - this.baseChainOffset);
            const frontDistance = index === 0
                ? this.distanceTraveled
                : this.partTrailDistances[index - 1];
            // Never move a segment backward along the recorded trail as spacing changes.
            const partDistance = Math.max(
                this.partTrailDistances[index],
                frontDistance - spacing,
            );
            this.partTrailDistances[index] = partDistance;

            const position = this.getTrailPosition(partDistance);
            part.position.set(position.x - this.container.x, position.y - this.container.y);
        });
    }

    update(deltaMS) {
        // Disabling movement cancels pointer movement at the current position; idle remains active.
        if (this.move !== this.previousMove) {
            if (!this.move) {
                this.dragging = false;
                this.idleCenterX = this.container.x;
                this.idleCenterY = this.container.y;
                this.targetX = this.container.x;
                this.targetY = this.container.y;
                this.idleActive = true;
            }
            this.previousMove = this.move;
        }

        // When idle, let the creature follow the cursor within a small radius around its idle center.
        if (!this.dragging && this.idleActive) {
            const cursorOffsetX = this.cursorX - this.idleCenterX;
            const cursorOffsetY = this.cursorY - this.idleCenterY;
            const cursorDistance = Math.hypot(cursorOffsetX, cursorOffsetY);
            const idleScale = cursorDistance > this.idleRadius
                ? this.idleRadius / cursorDistance
                : 1;

            this.targetX = this.idleCenterX + cursorOffsetX * idleScale;
            this.targetY = this.idleCenterY + cursorOffsetY * idleScale;
        }

        const dx = this.targetX - this.container.x;
        const dy = this.targetY - this.container.y;
        const distanceToTarget = Math.hypot(dx, dy);
        const deltaSeconds = deltaMS / 1000;
        let moveX = 0;
        let moveY = 0;

        // Turn toward the current target and ease movement without rotating the body sprites.
        if (distanceToTarget > 0.5) {
            const targetHeading = Math.atan2(dy, dx);
            const headingDifference = Math.atan2(
                Math.sin(targetHeading - this.heading),
                Math.cos(targetHeading - this.heading),
            );
            const maxTurnThisFrame = this.maxTurnRate * deltaSeconds;
            this.heading += Math.max(
                -maxTurnThisFrame,
                Math.min(maxTurnThisFrame, headingDifference),
            );

            const easing = 1 - Math.exp(-1.5 * deltaSeconds);
            const alignment = Math.max(0.2, Math.cos(headingDifference));
            const stepDistance = distanceToTarget * easing * alignment;
            const nextX = this.container.x + Math.cos(this.heading) * stepDistance;
            const nextY = this.container.y + Math.sin(this.heading) * stepDistance;

            moveX = nextX - this.container.x;
            moveY = nextY - this.container.y;
            this.container.position.set(nextX, nextY);
            this.distanceTraveled += Math.hypot(moveX, moveY);
            this.trail.push({
                x: this.container.x,
                y: this.container.y,
                distance: this.distanceTraveled,
            });

            const oldestDistance = this.distanceTraveled
                - this.chainLength - this.trailSampleSpacing;
            while (this.trail.length > 2 && this.trail[1].distance < oldestDistance) {
                this.trail.shift();
            }
        }

        if (!this.dragging && !this.idleActive && distanceToTarget <= 0.5) {
            this.idleCenterX = this.targetX;
            this.idleCenterY = this.targetY;
            this.idleActive = true;
        }

        // Use acceleration to smoothly stretch the chain while it starts or changes movement.
        if (deltaSeconds > 0) {
            const velocityX = moveX / deltaSeconds;
            const velocityY = moveY / deltaSeconds;
            const acceleration = Math.hypot(
                (velocityX - this.previousVelocityX) / deltaSeconds,
                (velocityY - this.previousVelocityY) / deltaSeconds,
            );
            const stretch = Math.min(1, acceleration / this.accelerationForMaxStretch);
            const targetChainOffset = this.baseChainOffset
                + (this.maxChainOffset - this.baseChainOffset) * stretch;
            const adjustmentRate = targetChainOffset > this.chainOffset ? 8 : 2.5;
            const adjustment = 1 - Math.exp(-adjustmentRate * deltaSeconds);

            this.chainOffset += (targetChainOffset - this.chainOffset) * adjustment;
            this.previousVelocityX = velocityX;
            this.previousVelocityY = velocityY;
        }
        this.updateChain();

        // Add an always-on sideways wave to the trailing segments.
        this.idleWaveTime += deltaSeconds;
        this.segments.forEach((segment, index) => {
            const wavePhase = this.idleWaveTime * this.idleWaveFrequency
                - index * this.idleWavePhaseOffset;
            const waveOffset = Math.sin(wavePhase) * this.idleWaveAmplitude;

            segment.x -= Math.sin(this.heading) * waveOffset;
            segment.y += Math.cos(this.heading) * waveOffset;
        });

        // Skew the face toward the latest cursor position without rotating the creature.
        const cursorDX = this.cursorX - this.container.x;
        const cursorDY = this.cursorY - this.container.y;
        const targetSkewX = Math.max(
            -this.maxFaceSkew,
            Math.min(
                this.maxFaceSkew,
                -cursorDY / (this.app.screen.height / 2) * this.maxFaceSkew,
            ),
        );
        const targetSkewY = Math.max(
            -this.maxFaceSkew,
            Math.min(
                this.maxFaceSkew,
                cursorDX / (this.app.screen.width / 2) * this.maxFaceSkew,
            ),
        );
        const skewEase = 1 - Math.exp(-8 * deltaSeconds);

        this.face.skew.x += (targetSkewX - this.face.skew.x) * skewEase;
        this.face.skew.y += (targetSkewY - this.face.skew.y) * skewEase;
    }
}