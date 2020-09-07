<template>
	<div>
		<div class="wrapper">
			<canvas
        :style="canvasStyle"
				ref="canvas"
				@pointerdown="down"
				@pointermove="move"
				@pointerup="up"
				width="200"
				height="200"
			/>
		</div>
    <div>
      <input type="color" v-model="selectedColor" />
    </div>
	</div>
</template>

<script>
const vscode = acquireVsCodeApi();
let canvas;
let ctx;
let arr;

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

function round(p){
  return Math.floor(p)
}

export default {
	data() {
		return {
			drag: false,
			old: null,
			eraser: false,
			color: 'black',
      lineWidth: 1,
      scale: 8,
      selectedColor: "#FF0000",
      width: 200,
      height: 200
		};
  },
  computed:{
    canvasStyle(){
      return {
        transform: `scale(${this.scale})`,
      }
    }
  },
	mounted() {
    canvas = this.$refs.canvas;
		ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
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
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
        this.width = canvas.width
        this.height = canvas.height

        arr = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.ready = true;
        this.redraw()
			}
		},
		down(ev) {
			canvas.setPointerCapture(ev.pointerId);
			this.drag = true;
			this.old = {
				x: round(ev.offsetX),
				y: round(ev.offsetY)
      };
      this.move(ev)
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
        this.line(this.old.x, this.old.y, round(ev.offsetX), round(ev.offsetY));
				this.old = {
					x: round(ev.offsetX),
					y: round(ev.offsetY)
        };
        this.redraw()
			}
    },
    redraw() {
      ctx.putImageData(arr, 0, 0);
    },
    line(x0, y0, x1, y1) {
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        this.setPixel(x0, y0);
        if (x0 == x1 && y0 == y1) {
          break;
        }
        const e2 = err << 1;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    },
    setPixel(x, y) {
      if (x < 0) {
        return;
      }
      if (y < 0) {
        return;
      }
      if (x > this.width) {
        return;
      }
      if (y > this.height) {
        return;
      }

      const start = (y * this.width + x) * 4;
      arr.data[start] = parseInt(this.selectedColor.slice(1, 3), 16);
      arr.data[start + 1] = parseInt(this.selectedColor.slice(3, 5), 16);
      arr.data[start + 2] = parseInt(this.selectedColor.slice(5, 7), 16);
      arr.data[start + 3] = 255;
    },
	}
};
</script>

<style>
canvas {
  position: absolute;
  top: 0;
  left: 0;
	touch-action: none;
  transform-origin: top left;
	background: white;
  image-rendering: pixelated;
}

.wrapper{
  position: relative;
  width: 800px;
  height: 600px;
  background: #DDD;
  overflow: scroll;
}
</style>