<template>
	<div>
		<div>
			<canvas
				ref="canvas"
				@pointerdown="down"
				@pointermove="move"
				@pointerup="up"
				width="200"
				height="200"
			/>
		</div>
	</div>
</template>

<script>
const vscode = acquireVsCodeApi();
let canvas;
let ctx;

async function loadImageFromData(initialContent) {
	const blob = new Blob([initialContent], { type: 'image/png' });
	const url = URL.createObjectURL(blob);
	try {
		const img = document.createElement('img');
		img.crossOrigin = 'anonymous';
		img.src = url;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});
		return img;
	} finally {
		URL.revokeObjectURL(url);
	}
}
async function getImageData() {
	const outCanvas = document.createElement('canvas');
	outCanvas.width = canvas.width;
	outCanvas.height = canvas.height;

	const outCtx = outCanvas.getContext('2d');
	outCtx.drawImage(canvas, 0, 0);

	const blob = await new Promise(resolve => {
		outCanvas.toBlob(resolve, 'image/png');
	});

	return new Uint8Array(await blob.arrayBuffer());
}

export default {
	data() {
		return {
			drag: false,
			old: null,
			eraser: false,
			color: 'black',
			lineWidth: 1
		};
	},
	mounted() {
		canvas = this.$refs.canvas;
		ctx = canvas.getContext('2d', {
			desynchronized: true
		});
		ctx.lineCap = 'round';
		window.addEventListener('message', async e => {
			const { type, body, requestId } = e.data;
			switch (type) {
				case 'init': {
					if (body.untitled) {
						canvas.height = 100;
						canvas.width = 100;
						ctx.fillStyle = 'white';
						ctx.fillRect(0, 0, 100, 100);
						return;
					} else {
						// Load the initial image into the canvas.
						const data = new Uint8Array(body.value.data);
						await this.reset(data);
						return;
					}
				}
				case 'update': {
					let data = body.content ? new Uint8Array(body.content.data) : undefined;
					//get last snapshot
					if (body.edits.length > 0) {
						data = body.edits[body.edits.length - 1].snapshot.data;
					}
					await this.reset(new Uint8Array(data));
					return;
				}
				case 'getFileData': {
					// Get the image data for the canvas and post it back to the extension.
					getImageData().then(data => {
						vscode.postMessage({ type: 'response', requestId, body: Array.from(data) });
					});
					return;
				}
			}
		});

		vscode.postMessage({ type: 'ready' });
	},
	methods: {
		async reset(data) {
			if (data) {
				const img = await loadImageFromData(data);
				// this.initialCanvas.width = this.drawingCanvas.width = img.naturalWidth;
				// this.initialCanvas.height = this.drawingCanvas.height = img.naturalHeight;
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				this.ready = true;
			}
		},
		down(ev) {
			canvas.setPointerCapture(ev.pointerId);
			this.drag = true;
			this.old = {
				x: ev.offsetX,
				y: ev.offsetY
			};
		},
		async up() {
			this.drag = false;

			vscode.postMessage({
				type: 'update',
				snapshot: await getImageData()
			});
		},
		move(ev) {
			if (this.drag) {
				ctx.beginPath();
				ctx.strokeStyle = this.color;
				ctx.moveTo(this.old.x, this.old.y);
				ctx.lineTo(ev.offsetX, ev.offsetY);
				ctx.stroke();
				this.old = {
					x: ev.offsetX,
					y: ev.offsetY
				};
			}
		}
	}
};
</script>

<style>
canvas {
	touch-action: none;
	background: white;
}
</style>