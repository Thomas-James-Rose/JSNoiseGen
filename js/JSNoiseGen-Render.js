class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a || 1;
    }

    toString() {
        return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
    }

    static lerp(c1, c2, t) {
        var r = (1 - t) * c1.r + t * c2.r;
        var g = (1 - t) * c1.g + t * c2.g;
        var b = (1 - t) * c1.b + t * c2.b;
        var a = (1 - t) * c1.a + t * c2.a;
        return new Color(Math.round(r), Math.round(g), Math.round(b), a)
    }
}

function load() {
    var nm = new NoiseMap(512, 512);

    // Set up the canvas
    console.log("Getting canvas context and resizing...")
    c = document.getElementById("map-canvas");
    c.width = nm.grid.length;
    c.height = nm.grid[0].length;
    ctx = c.getContext("2d");
    console.log("The canvas context has been successfully set up.")

    // === Add noise generation here === //
    //nm = JSNoiseGen.worley(nm, 1, 20);
    //nm = JSNoiseGen.diamondSquare(nm, 0.1, 1.2);
    nm = JSNoiseGen.value(nm, 16);
    // === Noise generation ends here === //

    // Grayscale Render
    for (var x = 0; x < nm.grid.length; x++) {
        for (var y = 0; y < nm.grid[0].length; y++) {
            var c = new Color(Math.round(nm.grid[x][y] * 255), Math.round(nm.grid[x][y] * 255), Math.round(nm.grid[x][y] * 255));
            ctx.fillStyle = c.toString();
            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Cloud Render
    /*for(var x = 0; x < nm.grid.length; x++) {
      for (var y = 0; y < nm.grid[0].length; y++) {
        var sky = new Color(135, 206, 235);
        var cloud = new Color(255, 255, 255);
        var t = nm.grid[x][y]/255;
        var finalColor = Color.lerp(sky, cloud, t);
        ctx.fillStyle = finalColor.toString();
        ctx.fillRect(x, y, 1, 1);
      }
    }*/

    console.log('Map Loaded.');
}

document.addEventListener('DOMContentLoaded', load);
