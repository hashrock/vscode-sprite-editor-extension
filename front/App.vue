<template>
  <div>
    <div class="wrapper">
      <canvas class="bg" :style="canvasStyle" ref="canvasBg" width="200" height="200" />
      <canvas
        class="canvasMain"
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
      <button
        class="palette"
        v-for="c in colors"
        :key="c"
        :style="{backgroundColor: `${c}`}"
        @click="selectedColor = c"
      ></button>
    </div>
    <div>
      <label>
        <input type="checkbox" v-model="eraser" />Eraser
      </label>
      <label>
        <input type="checkbox" v-model="flood" />flood
      </label>
      <select v-model.number="scale">
        <option value="1">x1</option>
        <option value="2">x2</option>
        <option value="4">x4</option>
        <option value="8">x8</option>
        <option value="16">x16</option>
        <option value="32">x32</option>
      </select>
      <select v-model.number="strokeWidth">
        <option value="1">w1</option>
        <option value="2">w2</option>
        <option value="3">w3</option>
      </select>
    </div>
  </div>
</template>

<script>
const vscode = acquireVsCodeApi();
let canvas;
let ctx;
let imageData;
import * as FloodFill from "./flood";
import * as color from "./color"

const colors = [
  "#000000",
  "#9d9d9d",
  "#ffffff",
  "#be2633",
  "#e06f8b",
  "#493c2b",
  "#a46422",
  "#eb8931",
  "#f7e26b",
  "#2f484e",
  "#44891a",
  "#a3ce27",
  "#1b2632",
  "#005784",
  "#31a2f2",
  "#b2dcef"
];
async function loadImageFromData(initialContent) {
  const blob = new Blob([initialContent], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  try {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
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
  const outCanvas = document.createElement("canvas");
  outCanvas.width = canvas.width;
  outCanvas.height = canvas.height;

  const outCtx = outCanvas.getContext("2d");
  outCtx.drawImage(canvas, 0, 0);

  const blob = await new Promise(resolve => {
    outCanvas.toBlob(resolve, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

function round(p) {
  return Math.floor(p);
}

export default {
  data() {
    return {
      drag: false,
      old: null,
      eraser: false,
      color: "black",
      lineWidth: 1,
      scale: 16,
      selectedColor: "#000000",
      width: 200,
      height: 200,
      colors: colors,
      strokeWidth: 1,
      flood: false
    };
  },
  computed: {
    canvasStyle() {
      return {
        transform: `scale(${this.scale})`
      };
    }
  },
  mounted() {
    canvas = this.$refs.canvas;
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    window.addEventListener("message", async e => {
      const { type, body, requestId } = e.data;
      switch (type) {
        case "init": {
          if (body.untitled) {
            canvas.height = 32;
            canvas.width = 32;
            ctx.clearRect(0, 0, 32, 32);
            this.setupCanvasBg(32, 32);
            return;
          } else {
            // Load the initial image into the canvas.
            const data = new Uint8Array(body.value.data);
            await this.reset(data);
            return;
          }
        }
        case "update": {
          let data = body.content
            ? new Uint8Array(body.content.data)
            : undefined;
          //get last snapshot
          if (body.edits.length > 0) {
            data = body.edits[body.edits.length - 1].snapshot.data;
          }
          await this.reset(new Uint8Array(data));
          return;
        }
        case "getFileData": {
          // Get the image data for the canvas and post it back to the extension.
          getImageData().then(data => {
            vscode.postMessage({
              type: "response",
              requestId,
              body: Array.from(data)
            });
          });
          return;
        }
      }
    });

    vscode.postMessage({ type: "ready" });
  },
  methods: {
    setupCanvasBg(width, height) {
      const canvas = this.$refs.canvasBg;
      const ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const start = (y * imageData.width + x) * 4;
          let bright = x % 2 === 0;
          if (y % 2 === 0) {
            bright = !bright;
          }
          imageData.data[start] = bright ? 200 : 180;
          imageData.data[start + 1] = bright ? 200 : 180;
          imageData.data[start + 2] = bright ? 200 : 180;
          imageData.data[start + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },
    async reset(data) {
      if (data) {
        const img = await loadImageFromData(data);
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        this.width = canvas.width;
        this.height = canvas.height;

        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.ready = true;

        this.setupCanvasBg(canvas.width, canvas.height);
        this.redraw();
      }
    },
    down(ev) {
      if (ev.button === 0) {
        if (this.flood) {
          this.startFlood(round(ev.offsetX), round(ev.offsetY));
        } else {
          canvas.setPointerCapture(ev.pointerId);
          this.drag = true;
          this.old = {
            x: round(ev.offsetX),
            y: round(ev.offsetY)
          };
          this.move(ev);
        }
      }
      if (ev.button === 2) {
        const pixel = this.getPixel(round(ev.offsetX), round(ev.offsetY));
        this.selectedColor =
          "#" +
          parseInt(pixel[0]).toString(16) +
          parseInt(pixel[1]).toString(16) +
          parseInt(pixel[2]).toString(16);
        if (pixel[3] === 0) {
          this.eraser = true;
        } else {
          this.eraser = false;
        }
      }
    },
    async up(ev) {
      if (this.drag) {
        this.drag = false;

        vscode.postMessage({
          type: "update",
          snapshot: await getImageData()
        });
      }
    },
    move(ev) {
      if (this.drag) {
        this.line(this.old.x, this.old.y, round(ev.offsetX), round(ev.offsetY));
        this.old = {
          x: round(ev.offsetX),
          y: round(ev.offsetY)
        };
        this.redraw();
      }
    },
    redraw() {
      ctx.putImageData(imageData, 0, 0);
    },
    line(x0, y0, x1, y1) {
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        if (this.strokeWidth === 1) {
          this.setPixel(x0, y0);
        }
        if (this.strokeWidth === 2) {
          this.setPixel(x0, y0);
          this.setPixel(x0 + 1, y0);
          this.setPixel(x0, y0 + 1);
          this.setPixel(x0 + 1, y0 + 1);
        }
        if (this.strokeWidth === 3) {
          this.setPixel(x0 - 1, y0 - 1);
          this.setPixel(x0 - 1, y0);
          this.setPixel(x0 - 1, y0 + 1);
          this.setPixel(x0, y0 - 1);
          this.setPixel(x0, y0);
          this.setPixel(x0, y0 + 1);
          this.setPixel(x0 + 1, y0 - 1);
          this.setPixel(x0 + 1, y0);
          this.setPixel(x0 + 1, y0 + 1);
        }

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
      if (this.eraser) {
        imageData.data[start] = 0;
        imageData.data[start + 1] = 0;
        imageData.data[start + 2] = 0;
        imageData.data[start + 3] = 0;
      } else {
        imageData.data[start] = parseInt(this.selectedColor.slice(1, 3), 16);
        imageData.data[start + 1] = parseInt(
          this.selectedColor.slice(3, 5),
          16
        );
        imageData.data[start + 2] = parseInt(
          this.selectedColor.slice(5, 7),
          16
        );
        imageData.data[start + 3] = 255;
      }
    },
    getPixel(x, y) {
      if (x < 0 || y < 0 || x > imageData.width || y > imageData.height) {
        return [-1, -1, -1, -1];
      }
      const start = (y * this.width + x) * 4;
      return [
        imageData.data[start],
        imageData.data[start + 1],
        imageData.data[start + 2],
        imageData.data[start + 3]
      ];
    },
    async startFlood(x, y) {
      const fillColor = color.colorToRGBA(this.selectedColor)

      FloodFill.floodfill(
        imageData.data,
        x,
        y,
        {
          r: fillColor[0],
          g: fillColor[1],
          b: fillColor[2],
          a: fillColor[3]
        },
        0,
        this.width,
        this.height
      );
      vscode.postMessage({
        type: "update",
        snapshot: await getImageData()
      });
      this.redraw();
    }
  }
};

function equalsColor(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
</script>

<style>
canvas {
  position: absolute;
  top: 0;
  left: 0;
  touch-action: none;
  transform-origin: top left;
  image-rendering: pixelated;
}

.wrapper {
  position: relative;
  width: 800px;
  height: 600px;
  background: #333;
  overflow: scroll;
}

.palette {
  width: 16px;
  height: 16px;
  border: none;
}
</style>