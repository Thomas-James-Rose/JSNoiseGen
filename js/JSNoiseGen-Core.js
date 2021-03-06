/*
 * ===============
 * === UTILITY ===
 * ===============
 */

// PRNG
Math.randomSeed = function() { // returns a random eight digit seed
    return Math.random() * (99999999 - 10000000) + 99999999;
}

Math.seed = Math.randomSeed();

Math.seededRandom = function(min, max) { // returns a float between
    min = min || 0;
    max = max || 1;
    var m = 233280;
    Math.seed = (Math.seed * 9301 + 49297) % m;
    var rnd = Math.seed / m;
    return min + rnd * (max - min);
}

// Euclidean Distance Function
function distance(p, q) {
    return Math.sqrt(Math.pow((p.x - q.x), 2) + Math.pow((p.y - q.y), 2));
}

// Data structure for noise map coordinates
class Coordinate {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
    setCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }
    setRandomCoordinate(xMin, xMax, yMin, yMax) {
        this.x = Math.round(Math.seededRandom(xMin, xMax));
        this.y = Math.round(Math.seededRandom(yMin, yMax));
    }

    setRandomCoordinate(grid) {
        this.x = Math.round(Math.seededRandom(0, grid.length));
        this.y = Math.round(Math.seededRandom(0, grid[0].length));
    }
}

// Noise Map data structure
class NoiseMap {
    constructor(x, y) {
        this.grid = new Array(x);
        for (var i = 0; i < this.grid.length; i++) this.grid[i] = new Array(y);
    }

    setCoordinate(x, y, z) {
        if (x < 0 || x > this.grid.length || y < 0 || y > this.grid[0].length)
            return -1;
        else try {
            if(this.grid[x][y] > 1) this.grid[x][y] = 1;
            if(this.grid[x][y] < 0) this.grid[x][y] = 0;
            this.grid[x][y] = z;
        } catch (e) {}
    }

    getCoordinate(x, y) {
        if (x < 0 || x > this.grid.length || y < 0 || y > this.grid[0].length)
            return -1;
        else try {
            return this.grid[x][y];
        } catch (e) {}
    }
}

/*
 * =====================
 * == NOISE FUNCTIONS ==
 * =====================
 */

/* The 'map' argument should be the an object of the class NoiseMap.
 * The noise functions return a 2D array of arbitrary size with each
 * value in the array ranging from 0-1 */

class JSNoiseGen {

    // DIAMOND-SQUARE ALGORITHM
    static diamondSquare(map, smoothing, seed) {
        Math.seed = seed || Math.randomSeed();
        var roughness = 0.25;

        // the Diamond-Square Algorithm requires a square grid of 2^n + 1 to work
        var dimension;
        if (map.grid.length >= map.grid[0].length)
            dimension = map.grid.length;
        else
            dimension = map.grid[0].length;
        if (map.grid.length < 3 || map.grid[0].length < 3) return null;
        if (dimension < 257) dimension = 257; // small noise
        else if (257 < dimension < 513) dimension = 513; // medium noise
        else if (513 < dimension < 1025) dimension = 1025; // big noise

        // generate separate square grid to run the Diamond-Square Algorithm on
        var noise = new NoiseMap(dimension, dimension);

        // fill the array with -1s
        for (var x = 0; x < noise.grid.length; x++)
            for (var y = 0; y < noise.grid[0].length; y++)
                noise.grid[x][y] = -1;

        // seed the corners
        noise.setCoordinate(0, 0, 0.5 + Math.seededRandom(-roughness, roughness)); // top left
        noise.setCoordinate(dimension - 1, 0, 0.5 + Math.seededRandom(-roughness, roughness)); // top right
        noise.setCoordinate(0, dimension - 1, 0.5 + Math.seededRandom(-roughness, roughness)); // bottom left
        noise.setCoordinate(dimension - 1, dimension - 1, 0.5 + Math.seededRandom(-roughness, roughness)); // bottom right

        // start the algorithm
        var size = dimension - 1;
        divide(size);

        function divide(size) {
            var x, y, half = ~~(size / 2);
            if (half < 1) return; // stop when sub-division is no longer possible

            // diamond
            for (y = half; y < dimension; y += size) {
                for (x = half; x < dimension; x += size) {
                    diamond(x, y, half, Math.seededRandom(-roughness, roughness));
                }
            }

            // square
            for (y = 0; y <= dimension; y += half) {
                for (x = (y + half) % size; x <= dimension; x += size) {
                    square(x, y, half, Math.seededRandom(-roughness, roughness));
                }
            }

            roughness = roughness / smoothing; // apply smoothing
            divide(size / 2);
        }

        // diamond step function
        function diamond(x, y, size, offset) {
            // average the four corners of the square
            var ave = average([
                noise.getCoordinate(x - size, y - size), // upper left
                noise.getCoordinate(x + size, y - size), // upper right
                noise.getCoordinate(x + size, y + size), // lower right
                noise.getCoordinate(x - size, y + size) // lower left
            ]);
            // set the mid-point of the square
            noise.setCoordinate(x, y, ave + offset);
        }

        // square step function
        function square(x, y, size, offset) {
            // average the four corners of the diamond
            var ave = average([
                noise.getCoordinate(x, y - size), // top
                noise.getCoordinate(x + size, y), // right
                noise.getCoordinate(x, y + size), // bottom
                noise.getCoordinate(x - size, y) // left
            ]);
            // set the mid-point of the diamond
            noise.setCoordinate(x, y, ave + offset);
        }

        // averaging function for the mid-points
        function average(values) {
            var valid = values.filter(function(val) {
                return val !== -1;
            });
            var total = valid.reduce(function(sum, val) {
                return sum + val;
            }, 0);
            return total / valid.length;
        }

        // update the noise map
        for (var x = 0; x < map.grid.length; x++) {
            for (var y = 0; y < map.grid[0].length; y++) {
                map.grid[x][y] = noise.grid[x][y];
            }
        }

        return map;
    }

    // VALUE NOISE
    static value(map, frequency, seed) {
        Math.seed = seed || Math.randomSeed();

        // code below is duplicated from DS Algorithm - clean this up!
        var dimension;
        if (map.grid.length >= map.grid[0].length) dimension = map.grid.length;
        else dimension = map.grid[0].length;
        if (map.grid.length < 3 || map.grid[0].length < 3) return null;
        if (dimension < 257) dimension = 257; // small noise
        else if (257 < dimension < 513) dimension = 513; // medium noise
        else if (513 < dimension < 1025) dimension = 1025; // big noise

        // generate separate square grid to run the Value Noise on
        var noise = new NoiseMap(dimension, dimension);

        // seed the grid points
        var gridStep = (dimension - 1) / frequency;
        for (var x = 0; x < dimension; x += gridStep) {
            for (var y = 0; y < dimension; y += gridStep) {
                noise.grid[x][y] = Math.seededRandom(0, 1);
            }
        }

        // interpolate the x-axis
        for(var x = 0; x < noise.grid.length; x++) {
          for(var y = 0; y < noise.grid[0].length; y += gridStep) {
            var x1 = x; // left grid point
            var x2 = x; // right grid point

            // find the left grid point
            while(x1 % gridStep != 0) { x1--; }

            // find the right grid point
            while(x2 % gridStep != 0) { x2++; }

            // interpolate
            var t = 0;
            if(x2 > 0 && x1 != x2) {
              var diff = x2 - x1;
              var alpha = (x - x1) / diff;
              var t = (1 - Math.cos(alpha * Math.PI)) / 2;
            }
            noise.grid[x][y] = lerp(noise.grid[x1][y], noise.grid[x2][y], t);
          }
        }

        // interpolate the y-axis
        for(var x = 0; x < noise.grid.length; x++) {
          for(var y = 0; y < noise.grid[0].length; y++) {
            var y1 = y; // upper grid point
            var y2 = y; // lower grid point

            // find the upper grid point
            while(y1 % gridStep != 0) { y1--; }

            // find the lower grid point
            while(y2 % gridStep != 0) { y2++; }

            // interpolate
            var t = 0;
            if(y2 > 0 && y1 != y2) {
              // cosine interpolation
              var diff = y2 - y1;
              var alpha = (y - y1) / diff;
              var t = (1 - Math.cos(alpha * Math.PI)) / 2;
            }
            noise.grid[x][y] = lerp(noise.grid[x][y1], noise.grid[x][y2], t);
          }
        }

        // update the noise map
        for (var x = 0; x < map.grid.length; x++) {
          for (var y = 0; y < map.grid[0].length; y++) {
              map.grid[x][y] = noise.grid[x][y];
          }
        }

        return map;

        // linear interpolation function
        function lerp(v1, v2, t) {
          return (1 - t) * v1 + t * v2;
        }
    }


    // PERLIN NOISE
    static perlin(map, noiseScale, seed) {
        Math.seed = seed || Math.randomSeed();

        /* Hash lookup table as defined by Ken Perlin. This is a randomly
        arranged array of all numbers from 0-255 inclusive. */
        var permutation = [ 151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        ];
        
        /* p[] is double the length of the hash lookup table above with the values 
        repeated a second time in the same order */
        var p = [];
        for (var i = 0; i < 256; i++) {
            p[256+i] = p[i] = permutation[i];
        }

        // ensure the noise scale is greater than 0
        if (noiseScale <= 0) { noiseScale = 0.0001; }

        // noisemap loop for generating noise
        var i = 0;
        var sampleX = 0;
        var sampleY = 0;
        var perlinValue = 0;
        for (var x = 0; x < map.grid.length; x++) {
            for (var y = 0; y < map.grid[0].length; y++) {
                sampleY = (Math.floor(i/map.grid[0].length)) / noiseScale;
                sampleX = (i%map.grid.length) / noiseScale;
                perlinValue = noise(sampleX,sampleY,0);  
                map.grid[x][y] = perlinValue;
                i++;
            }
        }

        return map;

        // noise function that calculates the value at each point
        function noise(x, y, z) { // from Ken Perlin's Java reference implementation of Improved Noise

            var X = Math.floor(x) & 255;                   // FIND UNIT CUBE THAT
            var Y = Math.floor(y) & 255;                   // CONTAINS POINT.
            var Z = Math.floor(z) & 255;
                
            x -= Math.floor(x);                            // FIND RELATIVE X,Y,Z
            y -= Math.floor(y);                            // OF POINT IN CUBE.
            z -= Math.floor(z);
            
            var u = fade(x);                               // COMPUTE FADE CURVES
            var v = fade(y);                               // FOR EACH OF X,Y,Z.
            var w = fade(z);

            var A = p[X  ]+Y, AA = p[A]+Z, AB = p[A+1]+Z;  // HASH COORDINATES OF
            var B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;  // THE 8 CUBE CORNERS,

            return scale(lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y ,  z   ),     // AND ADD
                                                 grad(p[BA  ], x-1, y  , z   )),    // BLENDED
                                         lerp(u, grad(p[AB  ], x  , y-1, z   ),     // RESULTS
                                                 grad(p[BB  ], x-1, y-1, z   ))),   // FROM  8
                                 lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),     // CORNERS
                                                 grad(p[BA+1], x-1, y  , z-1 )),    // OF CUBE
                                         lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                                 grad(p[BB+1], x-1, y-1, z-1 )))));
        }
        
        // smoothing function for coordinate values so that they ease towards integral values
        function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        
        // linear interpolation 
        function lerp(t, a, b) { return a + t * (b - a); }
        
        // gradient vector function
        function grad(hash, x, y, z) {
            let h = hash & 15;                                    // CONVERT LO 4 BITS OF HASH CODE
            let u = h < 8 ? x : y,                                // INTO 12 GRADIENT DIRECTIONS.
                    v = h < 4 ? y : h == 12 || h == 14 ? x : z;
            return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
        }
        
        // noise scaling function
        function scale(n) { return (1 + n)/2; }
    }


    // WORLEY NOISE
    static worley(map, n, features, seed) {
        Math.seed = seed || Math.randomSeed();

        // generate the feature points
        var fp = [];
        for (var i = 0; i < features; i++) {
            fp[i] = new Coordinate();
            fp[i].setRandomCoordinate(map.grid);
        }

        // for each pixel
        for (var x = 0; x < map.grid.length; x++) {
            for (var y = 0; y < map.grid[0].length; y++) {
                var index = 0;
                var currentPixel = new Coordinate();
                currentPixel.setCoordinate(x, y);
                var distanceValues = [];

                for (var i = 0; i < fp.length; i++) { // for each feature point
                    distanceValues.push(distance(currentPixel, fp[i])); //store the distance value
                    distanceValues.sort(function(a, b) {
                        return a - b
                    }); // sort the distance values
                }

                // assign the the distance value for the nth closest feature point to the pixel
                map.grid[x][y] = distanceValues[n - 1] / ((map.grid.length + map.grid[0].length) / 2);
            }
        }

        return map;
    }

}
