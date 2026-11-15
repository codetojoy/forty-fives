/**
 * The three.js half of the experimental 3D table (doc/BRAINSTORM-3D.md).
 *
 * Imperative on purpose: `update()` is handed the placements from `layout.ts`
 * and each card mesh tweens from wherever it is to where it now belongs. Cards
 * are keyed by id, so game transitions need no bespoke animation code.
 *
 * Browser-only — this module (and three.js with it) is loaded with a dynamic
 * import from Table3D.svelte, so it never runs during prerender and is only
 * downloaded on the game page when the 3D table is switched on.
 *
 * Everything drawn here is project-original: card faces and backs are painted
 * onto canvases at runtime (same design as PlayingCard.svelte); the opponent's
 * portrait is the existing CC0 avatar SVG. No new asset files.
 */

import * as THREE from 'three';
import { SUIT_SYMBOLS, isRedSuit, type Card } from '$lib/domain/cards.js';
import {
	CARD_H,
	CARD_W,
	type Arrangement,
	type CardPlacement,
	type Zone
} from './layout.js';

/** Another player at the table: a name and (optionally) an avatar. */
export interface PortraitSpec {
	name: string;
	/** URL of the player's avatar SVG, if they have one. */
	avatarUrl?: string;
	/** Ring colour — e.g. to tell your partner from the opponents. */
	accent?: string;
}

export interface SceneOptions {
	onpick: (card: Card) => void;
	/** Where the stock and portraits sit, and what the camera must show. */
	arrangement: Arrangement;
	/** One per `arrangement.portraitSpots` entry, in the same order. */
	portraits: readonly PortraitSpec[];
}

const MOVE_MS = 420;
const DEAL_STAGGER_MS = 75;
const TEX_W = 400;
const TEX_H = 560;

const COLORS = {
	floor: 0x2a2320,
	wood: 0x6b3f2a,
	felt: 0x2f6b50,
	cardPaper: '#fffdf6',
	cardBack: '#9c4632',
	cardBackLine: '#b0503a',
	red: '#c0262d',
	black: '#1a1a1a',
	ring: 0xf2c14e,
	winnerRing: 0x4caf6e
};

/** Force text (not emoji) presentation of suit symbols on canvas. */
const TEXT_VS = '︎';

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
	const x = -w / 2;
	const y = -h / 2;
	const s = new THREE.Shape();
	s.moveTo(x + r, y);
	s.lineTo(x + w - r, y);
	s.quadraticCurveTo(x + w, y, x + w, y + r);
	s.lineTo(x + w, y + h - r);
	s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	s.lineTo(x + r, y + h);
	s.quadraticCurveTo(x, y + h, x, y + h - r);
	s.lineTo(x, y + r);
	s.quadraticCurveTo(x, y, x + r, y);
	return s;
}

/** A rounded card-shaped plane with UVs spanning the whole texture. */
function cardGeometry(scale = 1): THREE.ShapeGeometry {
	const w = CARD_W * scale;
	const h = CARD_H * scale;
	const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, 0.07 * scale), 6);
	const pos = geo.attributes.position;
	const uv = geo.attributes.uv;
	for (let i = 0; i < pos.count; i++) {
		uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
	}
	return geo;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	return [canvas, canvas.getContext('2d')!];
}

function paintFace(card: Card): HTMLCanvasElement {
	const [canvas, ctx] = makeCanvas(TEX_W, TEX_H);
	const k = TEX_W / 200; // PlayingCard.svelte draws on a 200 × 280 viewBox
	ctx.fillStyle = COLORS.cardPaper;
	ctx.fillRect(0, 0, TEX_W, TEX_H);
	ctx.strokeStyle = '#222';
	ctx.lineWidth = 5 * k;
	ctx.strokeRect(0, 0, TEX_W, TEX_H);

	const suit = SUIT_SYMBOLS[card.suit] + TEXT_VS;
	ctx.fillStyle = isRedSuit(card.suit) ? COLORS.red : COLORS.black;
	ctx.textAlign = 'center';
	const font = (px: number, bold: boolean) =>
		`${bold ? '700 ' : ''}${px * k}px Lato, "Helvetica Neue", Arial, sans-serif`;

	const corner = () => {
		ctx.font = font(36, true);
		ctx.fillText(card.rank, 30 * k, 48 * k);
		ctx.font = font(34, false);
		ctx.fillText(suit, 30 * k, 86 * k);
	};
	corner();
	ctx.save();
	ctx.translate(TEX_W, TEX_H);
	ctx.rotate(Math.PI);
	corner();
	ctx.restore();

	ctx.font = font(76, true);
	ctx.fillText(card.rank, 100 * k, 138 * k);
	ctx.font = font(86, false);
	ctx.fillText(suit, 100 * k, 232 * k);
	return canvas;
}

function paintBack(): HTMLCanvasElement {
	const [canvas, ctx] = makeCanvas(TEX_W, TEX_H);
	const k = TEX_W / 200;
	ctx.fillStyle = COLORS.cardPaper;
	ctx.fillRect(0, 0, TEX_W, TEX_H);
	ctx.strokeStyle = '#222';
	ctx.lineWidth = 5 * k;
	ctx.strokeRect(0, 0, TEX_W, TEX_H);

	ctx.fillStyle = COLORS.cardBack;
	ctx.fillRect(14 * k, 14 * k, 172 * k, 252 * k);
	ctx.strokeStyle = COLORS.cardBackLine;
	ctx.lineWidth = 2 * k;
	ctx.beginPath();
	for (let x = 14 + 8; x < 186; x += 16) {
		ctx.moveTo(x * k, 14 * k);
		ctx.lineTo(x * k, 266 * k);
	}
	for (let y = 14 + 8; y < 266; y += 16) {
		ctx.moveTo(14 * k, y * k);
		ctx.lineTo(186 * k, y * k);
	}
	ctx.stroke();

	ctx.fillStyle = COLORS.cardBack;
	ctx.strokeStyle = '#f7f2e7';
	ctx.lineWidth = 3 * k;
	ctx.beginPath();
	ctx.arc(100 * k, 140 * k, 42 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#f7f2e7';
	ctx.textAlign = 'center';
	ctx.font = `700 ${44 * k}px Lato, "Helvetica Neue", Arial, sans-serif`;
	ctx.fillText('45', 100 * k, 156 * k);
	return canvas;
}

interface Pose {
	x: number;
	y: number;
	z: number;
	rx: number;
	ry: number;
	rz: number;
}

interface CardEntry {
	id: string;
	card: Card;
	group: THREE.Group;
	front: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshLambertMaterial>;
	ring: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
	zone: Zone | 'stock';
	pickable: boolean;
	target: Pose;
	anim: { from: Pose; start: number; dur: number; lift: number; hideAtEnd: boolean } | null;
}

function stockPoseFor(arrangement: Arrangement): Pose {
	const { x, z } = arrangement.stock;
	return { x, y: 0.24, z, rx: Math.PI / 2, ry: 0, rz: 0 };
}

function samePose(a: Pose, b: Pose): boolean {
	return (
		a.x === b.x && a.y === b.y && a.z === b.z && a.rx === b.rx && a.ry === b.ry && a.rz === b.rz
	);
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export class TableScene {
	private renderer: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
	private cards = new Map<string, CardEntry>();
	private faceGeo = cardGeometry();
	private ringGeo = cardGeometry(1.1);
	private backTexture: THREE.CanvasTexture;
	private backMaterial: THREE.MeshLambertMaterial;
	private disposables: { dispose(): void }[] = [];
	private raycaster = new THREE.Raycaster();
	private frame = 0;
	private first = true;
	private reducedMotion: boolean;
	private resizeObserver: ResizeObserver;
	private pointerDown: { x: number; y: number } | null = null;
	private disposed = false;
	private arrangement: Arrangement;
	private stock!: THREE.Mesh;
	private portraits: { mesh: THREE.Mesh; repaint: () => void }[] = [];
	private activePortrait: number | null = null;
	private stockPose: Pose;

	constructor(
		private canvas: HTMLCanvasElement,
		private options: SceneOptions
	) {
		this.arrangement = options.arrangement;
		this.stockPose = stockPoseFor(options.arrangement);
		// Throws if WebGL is unavailable — Table3D.svelte catches and falls back to 2D.
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.scene.background = new THREE.Color(COLORS.floor);
		this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		this.backTexture = this.texture(paintBack());
		this.backMaterial = new THREE.MeshLambertMaterial({ map: this.backTexture });
		this.disposables.push(this.faceGeo, this.ringGeo, this.backMaterial);

		this.buildTable();
		this.buildLights();
		this.buildStock();
		this.options.portraits.forEach((spec, i) => this.buildPortrait(spec, i));
		this.placePortraits();

		canvas.addEventListener('pointerdown', this.onPointerDown);
		canvas.addEventListener('pointerup', this.onPointerUp);
		canvas.addEventListener('pointermove', this.onPointerMove);

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(canvas);
		this.resize();
	}

	// --- construction ---------------------------------------------------------

	private texture(source: HTMLCanvasElement): THREE.CanvasTexture {
		const tex = new THREE.CanvasTexture(source);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
		this.disposables.push(tex);
		return tex;
	}

	private track<T extends { dispose(): void }>(item: T): T {
		this.disposables.push(item);
		return item;
	}

	private buildTable() {
		const wood = new THREE.Mesh(
			this.track(new THREE.CylinderGeometry(5.5, 5.5, 0.4, 72)),
			this.track(new THREE.MeshLambertMaterial({ color: COLORS.wood }))
		);
		wood.position.y = -0.22;
		wood.receiveShadow = true;
		const felt = new THREE.Mesh(
			this.track(new THREE.CylinderGeometry(5.15, 5.15, 0.4, 72)),
			this.track(new THREE.MeshLambertMaterial({ color: COLORS.felt }))
		);
		felt.position.y = -0.2;
		felt.receiveShadow = true;
		this.scene.add(wood, felt);
	}

	private buildLights() {
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f72, 1.9));
		const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
		sun.position.set(-3, 9, 5);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		const c = sun.shadow.camera;
		c.left = -6;
		c.right = 6;
		c.top = 6;
		c.bottom = -6;
		c.near = 1;
		c.far = 25;
		sun.shadow.bias = -0.0008;
		sun.shadow.normalBias = 0.02;
		this.scene.add(sun);
	}

	/** The stock: a decorative block of cards that dealt cards fly out of. */
	private buildStock() {
		const side = this.track(new THREE.MeshLambertMaterial({ color: 0xe9e2d0 }));
		const block = new THREE.Mesh(
			this.track(new THREE.BoxGeometry(CARD_W, 0.22, CARD_H)),
			[side, side, this.backMaterial, side, side, side]
		);
		block.castShadow = true;
		block.receiveShadow = true;
		this.stock = block;
		this.scene.add(block);
		this.placeStock();
	}

	private placePortraits() {
		this.portraits.forEach(({ mesh }, i) => {
			const spot = this.arrangement.portraitSpots[i];
			if (!spot) return;
			mesh.position.set(spot.x, spot.y, spot.z);
			mesh.scale.setScalar(spot.scale);
		});
		this.facePortraitsToCamera();
	}

	/**
	 * Portraits are billboards: each is turned parallel to the camera's image
	 * plane, so its circle is drawn as a true circle wherever it stands. (A fixed
	 * tilt looked right only on the centre line — off to the side, perspective
	 * skewed it into an ellipse.)
	 */
	private facePortraitsToCamera() {
		for (const { mesh } of this.portraits) mesh.quaternion.copy(this.camera.quaternion);
	}

	private placeStock() {
		const { x, z } = this.arrangement.stock;
		this.stock.position.set(x, 0.11, z);
		this.stockPose = stockPoseFor(this.arrangement);
	}

	/** Switch arrangement — e.g. between the wide and the compact (phone) table. */
	setArrangement(arrangement: Arrangement) {
		if (arrangement === this.arrangement || this.disposed) return;
		this.arrangement = arrangement;
		this.placeStock();
		this.placePortraits();
		for (const entry of this.cards.values()) {
			if (entry.zone === 'stock') {
				entry.target = { ...this.stockPose };
				this.applyPose(entry, this.stockPose);
			}
		}
		this.fitCamera();
		this.requestRender();
	}

	/** Mark whose turn it is: that player's portrait gets a gold ring. */
	setActivePortrait(index: number | null) {
		if (index === this.activePortrait || this.disposed) return;
		const previous = this.activePortrait;
		this.activePortrait = index;
		if (previous !== null) this.portraits[previous]?.repaint();
		if (index !== null) this.portraits[index]?.repaint();
	}

	/** The opponent: their avatar and name on a small stand across the table. */
	private buildPortrait(spec: PortraitSpec, index: number) {
		const [canvas, ctx] = makeCanvas(512, 400);
		const tex = this.texture(canvas);
		let avatar: CanvasImageSource | undefined;
		const paint = (img: CanvasImageSource | undefined = avatar) => {
			avatar = img;
			const active = this.activePortrait === index;
			ctx.clearRect(0, 0, 512, 400);
			ctx.fillStyle = '#f7f2e7';
			ctx.beginPath();
			ctx.arc(256, 150, 140, 0, Math.PI * 2);
			ctx.fill();
			if (img) {
				ctx.save();
				ctx.beginPath();
				ctx.arc(256, 150, 134, 0, Math.PI * 2);
				ctx.clip();
				ctx.drawImage(img, 256 - 134, 150 - 134, 268, 268);
				ctx.restore();
			}
			ctx.lineWidth = active ? 16 : 8;
			ctx.strokeStyle = active ? '#f2c14e' : (spec.accent ?? COLORS.cardBack);
			ctx.beginPath();
			ctx.arc(256, 150, 138, 0, Math.PI * 2);
			ctx.stroke();

			ctx.font = '700 64px Lato, "Helvetica Neue", Arial, sans-serif';
			ctx.textAlign = 'center';
			ctx.lineWidth = 10;
			ctx.strokeStyle = 'rgba(20, 16, 14, 0.85)';
			ctx.strokeText(spec.name, 256, 372);
			ctx.fillStyle = '#fffdf6';
			ctx.fillText(spec.name, 256, 372);
			tex.needsUpdate = true;
			this.requestRender();
		};
		paint();

		const plane = new THREE.Mesh(
			this.track(new THREE.PlaneGeometry(2.3, 1.8)),
			this.track(new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
		);
		this.portraits.push({ mesh: plane, repaint: () => paint() });
		this.scene.add(plane);

		const url = spec.avatarUrl;
		if (url) {
			// The avatar SVGs carry a viewBox but no width/height; give the image an
			// explicit size so every browser will rasterize it onto the canvas.
			fetch(url)
				.then((r) => r.text())
				.then((svg) => {
					const sized = svg.replace('<svg ', '<svg width="536" height="536" ');
					const blobUrl = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
					const img = new Image();
					img.onload = () => {
						if (!this.disposed) paint(img);
						URL.revokeObjectURL(blobUrl);
					};
					img.onerror = () => URL.revokeObjectURL(blobUrl);
					img.src = blobUrl;
				})
				.catch(() => {
					// Portrait is decorative; the name is already drawn.
				});
		}
	}

	private createCard(id: string, card: Card): CardEntry {
		const group = new THREE.Group();
		const front = new THREE.Mesh(
			this.faceGeo,
			new THREE.MeshLambertMaterial({ map: this.texture(paintFace(card)) })
		);
		front.position.z = 0.004;
		front.castShadow = true;
		front.receiveShadow = true;
		front.material.shadowSide = THREE.DoubleSide;
		const back = new THREE.Mesh(this.faceGeo, this.backMaterial);
		back.rotation.y = Math.PI;
		// Face-down cards are flipped end over end; turn the back so its "45" reads upright.
		back.rotation.z = Math.PI;
		back.position.z = -0.004;
		back.receiveShadow = true;
		const ring = new THREE.Mesh(
			this.ringGeo,
			new THREE.MeshBasicMaterial({ color: COLORS.ring, side: THREE.DoubleSide })
		);
		ring.visible = false;
		this.disposables.push(front.material, ring.material);
		front.userData.cardId = id;
		back.userData.cardId = id;
		group.add(front, back, ring);
		this.scene.add(group);

		const entry: CardEntry = {
			id,
			card,
			group,
			front,
			ring,
			zone: 'stock',
			pickable: false,
			target: { ...this.stockPose },
			anim: null
		};
		this.applyPose(entry, this.stockPose);
		group.visible = false;
		this.cards.set(id, entry);
		return entry;
	}

	// --- updates --------------------------------------------------------------

	/** Move every card to where the layout now says it belongs. */
	update(placements: readonly CardPlacement[]) {
		if (this.disposed) return;
		const now = performance.now();
		// A game resumed mid-hand appears in place; a fresh deal is always dealt out.
		const midHand = placements.some((p) => p.zone === 'trick' || p.zone === 'pile');
		const instant = this.reducedMotion || (this.first && midHand);
		const seen = new Set<string>();

		for (const p of placements) {
			seen.add(p.id);
			const entry = this.cards.get(p.id) ?? this.createCard(p.id, p.card);
			const target: Pose = { x: p.x, y: p.y, z: p.z, rx: p.rx, ry: p.ry, rz: p.rz };

			// A card coming out of the stock (or back from a swept pile on a new
			// deal) starts at the stock and is dealt in turn.
			const dealt =
				(entry.zone === 'stock' || entry.zone === 'pile') &&
				(p.zone === 'hand' || p.zone === 'opponent' || p.zone === 'turn-up' || p.zone === 'kitty');
			if (dealt && !instant) {
				entry.anim = null;
				this.applyPose(entry, this.stockPose);
			}
			entry.group.visible = true;

			if (!samePose(entry.target, target) || dealt) {
				entry.target = target;
				if (instant) {
					entry.anim = null;
					this.applyPose(entry, target);
				} else {
					const from = this.currentPose(entry);
					const dist = Math.hypot(target.x - from.x, target.z - from.z);
					entry.anim = {
						from,
						start: now + (dealt ? p.order * DEAL_STAGGER_MS : 0),
						dur: p.zone === 'hand' && entry.zone === 'hand' ? 160 : MOVE_MS,
						lift: dist > 0.8 ? Math.min(0.9, 0.25 + dist * 0.12) : 0,
						hideAtEnd: false
					};
				}
			}

			entry.zone = p.zone;
			entry.pickable = p.pickable;
			entry.front.material.color.setHex(p.dimmed ? 0x8f8f8f : 0xffffff);
			entry.ring.visible = p.raised || p.winner;
			entry.ring.material.color.setHex(p.winner ? COLORS.winnerRing : COLORS.ring);
		}

		// Anything no longer in play (a robbed-away discard, last hand's cards)
		// slides back into the stock.
		for (const entry of this.cards.values()) {
			if (seen.has(entry.id) || entry.zone === 'stock') continue;
			entry.zone = 'stock';
			entry.pickable = false;
			entry.ring.visible = false;
			entry.front.material.color.setHex(0xffffff);
			entry.target = { ...this.stockPose };
			if (instant) {
				entry.anim = null;
				this.applyPose(entry, this.stockPose);
				entry.group.visible = false;
			} else {
				entry.anim = {
					from: this.currentPose(entry),
					start: now,
					dur: MOVE_MS,
					lift: 0.4,
					hideAtEnd: true
				};
			}
		}

		this.first = false;
		this.requestRender();
	}

	private currentPose(entry: CardEntry): Pose {
		const { position: p, rotation: r } = entry.group;
		return { x: p.x, y: p.y, z: p.z, rx: r.x, ry: r.y, rz: r.z };
	}

	private applyPose(entry: CardEntry, pose: Pose) {
		entry.group.position.set(pose.x, pose.y, pose.z);
		entry.group.rotation.set(pose.rx, pose.ry, pose.rz);
	}

	// --- rendering ------------------------------------------------------------

	private requestRender() {
		if (this.frame || this.disposed) return;
		this.frame = requestAnimationFrame(this.tick);
	}

	private tick = (now: number) => {
		this.frame = 0;
		let animating = false;
		for (const entry of this.cards.values()) {
			const a = entry.anim;
			if (!a) continue;
			const raw = (now - a.start) / a.dur;
			if (raw < 0) {
				animating = true;
				continue;
			}
			if (raw >= 1) {
				this.applyPose(entry, entry.target);
				if (a.hideAtEnd) entry.group.visible = false;
				entry.anim = null;
				continue;
			}
			animating = true;
			const t = easeInOut(raw);
			const lerp = (k: keyof Pose) => a.from[k] + (entry.target[k] - a.from[k]) * t;
			entry.group.position.set(lerp('x'), lerp('y') + Math.sin(Math.PI * raw) * a.lift, lerp('z'));
			entry.group.rotation.set(lerp('rx'), lerp('ry'), lerp('rz'));
		}
		this.renderer.render(this.scene, this.camera);
		if (animating) this.requestRender();
	};

	private resize() {
		if (this.disposed) return;
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		if (w === 0 || h === 0) return;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.fitCamera();
		this.requestRender();
	}

	/**
	 * Pull the camera back along a fixed line of sight until the whole playing
	 * area fits, whatever the canvas shape — so a narrow phone gets the largest
	 * cards that still show everything.
	 */
	private fitCamera() {
		const target = new THREE.Vector3(0, 0, 0.45);
		const dir = new THREE.Vector3(0, 0.82, 0.57).normalize();
		const corners = this.arrangement.fitPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));

		const fits = (d: number) => {
			this.camera.position.copy(target).addScaledVector(dir, d);
			this.camera.lookAt(target);
			this.camera.updateProjectionMatrix();
			this.camera.updateMatrixWorld();
			return corners.every((c) => {
				const v = c.clone().project(this.camera);
				return Math.abs(v.x) <= 0.97 && Math.abs(v.y) <= 0.97;
			});
		};
		let lo = 4;
		let hi = 60;
		for (let i = 0; i < 24; i++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) hi = mid;
			else lo = mid;
		}
		fits(hi);
		this.facePortraitsToCamera();
	}

	// --- picking --------------------------------------------------------------

	private cardAt(event: PointerEvent): CardEntry | null {
		const rect = this.canvas.getBoundingClientRect();
		const ndc = new THREE.Vector2(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1
		);
		this.raycaster.setFromCamera(ndc, this.camera);
		const meshes: THREE.Object3D[] = [];
		for (const entry of this.cards.values()) {
			if (entry.pickable && entry.group.visible) meshes.push(entry.front);
		}
		const hit = this.raycaster.intersectObjects(meshes, false)[0];
		return hit ? (this.cards.get(hit.object.userData.cardId) ?? null) : null;
	}

	private onPointerDown = (event: PointerEvent) => {
		this.pointerDown = { x: event.clientX, y: event.clientY };
	};

	private onPointerUp = (event: PointerEvent) => {
		const down = this.pointerDown;
		this.pointerDown = null;
		// A tap, not a scroll/drag that happened to end over the canvas.
		if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
		const entry = this.cardAt(event);
		if (entry) this.options.onpick(entry.card);
	};

	private onPointerMove = (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return;
		this.canvas.style.cursor = this.cardAt(event) ? 'pointer' : '';
	};

	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.frame);
		this.resizeObserver.disconnect();
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		for (const d of this.disposables) d.dispose();
		this.renderer.dispose();
	}
}
