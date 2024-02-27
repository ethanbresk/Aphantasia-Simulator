//testing
import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

class Cube_Outline extends Shape {
    constructor() {
        super("position", "color");
        //  TODO (Requirement 5).
        // When a set of lines is used in graphics, you should think of the list entries as
        // broken down into pairs; each pair of vertices will be drawn as a line segment.
        // Note: since the outline is rendered with Basic_shader, you need to redefine the position and color of each vertex
        this.arrays.position.push(...Vector3.cast(
            [1,1,-1], [1,-1,-1], [-1,1,1], [-1,-1,1], [1,1,-1],  [-1,1,-1],  [1,1,1],  [-1,1,1],
            [-1,-1,-1], [-1,-1,1], [-1,1,-1], [-1,1,1], [1,-1,1],  [1,-1,-1],  [1,1,1],  [1,1,-1],
            [1,-1,1],  [-1,-1,1],  [1,-1,1],  [1,1,1], [1,-1,-1], [-1,-1,-1], [-1,-1,-1], [-1,1,-1]));

        for (let i = 0; i<24; i++) {
            this.arrays.color.push(color(1, 1, 1, 1));
        }
        this.indexed = false;
    }
}

class Cube_Single_Strip extends Shape {
    constructor() {
        super("position", "normal");
        // TODO (Requirement 6)
        this.arrays.position.push(...Vector3.cast(
            [-1,-1,-1], [1,-1,-1], [-1,-1,1], [1,-1,1],
            [-1,1,-1], [1,1,-1], [-1,1,1], [1,1,1]));

        this.arrays.normal.push(...Vector3.cast(
            [-1,-1,-1], [1,-1,-1], [-1,-1,1], [1,-1,1],
            [-1,1,-1], [1,1,-1], [-1,1,1], [1,1,1]));

        this.indices.push(0, 1, 2, 2, 1, 3, 4, 5,
                            6, 6, 5, 7, 0, 2, 4, 4,
                            2, 6, 1, 3, 5, 5, 3, 7,
                            0, 1, 4, 4, 1, 5, 2, 3, 6, 6, 3, 7);
    }
}


class Sphere extends Shape {
    constructor(latitude_bands=12, longitude_bands=24) {
        super("position", "normal", "texture_coord");
        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        for (let latNumber = 0; latNumber <= latitude_bands; latNumber++) {
            const theta = latNumber * Math.PI / latitude_bands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= longitude_bands; longNumber++) {
                const phi = longNumber * 2 * Math.PI / longitude_bands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                const u = 1 - (longNumber / longitude_bands);
                const v = 1 - (latNumber / latitude_bands);

                normals.push(vec3(x, y, z));
                texCoords.push(vec(u, v));
                vertices.push(vec3(x, y, z));
            }
        }

        for (let latNumber = 0; latNumber < latitude_bands; latNumber++) {
            for (let longNumber = 0; longNumber < longitude_bands; longNumber++) {
                const first = (latNumber * (longitude_bands + 1)) + longNumber;
                const second = first + longitude_bands + 1;
                indices.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }

        this.arrays.position = vertices;
        this.arrays.normal = normals;
        this.arrays.texture_coord = texCoords;
        this.indices = indices;
    }
}



class Base_Scene extends Scene {
 
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            'outline': new Cube_Outline(),
            'strip': new Cube_Single_Strip(),
            'sphere': new Sphere(12, 24)
           
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        };
        // The white material and basic shader are used for drawing the outline.
        this.white = new Material(new defs.Basic_Shader());

        // extra definitions
        this.colors = [];
        this.outlined = false;
        this.swaying = true;

        // set initial colors
        this.set_colors();
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(5, -10, -30));
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
}

export class Project extends Base_Scene {
  
    set_colors() {
        // fill colors array
        for (var i = 0; i < 8; i++) {
            this.colors[i] = color(Math.random(), Math.random(), Math.random(), 1.0);
        }
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Change Colors", ["c"], this.set_colors);
        // Add a button for controlling the scene.
        this.key_triggered_button("Outline", ["o"], () => {
            this.outlined = !this.outlined;
        });
        this.key_triggered_button("Sit still", ["m"], () => {
            this.swaying = !this.swaying;
        });
    }

    // draws a box
    draw_box(context, program_state, model_transform, color, index) {
        // constants
        const angleLimit = 0.05 * Math.PI;
        const time = program_state.animation_time / 1000;
        // angle variable
        var angle = 0;

        // extend boxes to max angle when swaying is disabled
        if (this.swaying === false) {
            angle = angleLimit;
        }
        // otherwise calculate angle using time
        else {
            angle = (angleLimit/2) + (angleLimit/2)*(Math.sin(Math.PI*time));
        }
        // base box shouldn't sway
        if (index === 0) {
            model_transform = model_transform.times(Mat4.scale(1, 1.5, 1)) // scale 1.5x
        }
        else {
            model_transform = model_transform
                .times(Mat4.translation(-1, 1.5, 0))    // move center of box to hinge point at top left
                .times(Mat4.rotation(angle, 0, 0, 1))   // start rotation
                .times(Mat4.scale(1, 1.5, 1))           // scale 1.5x
                .times(Mat4.translation(1, 1, 0))       // translate corner of box to hinge point
        }

        if (this.outlined === true) {
            this.shapes.outline.draw(context, program_state, model_transform, this.white, "LINES");
        }
        // if odd box
        else if ((index+1)%2 !== 1) {
            this.shapes.strip.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}), "TRIANGLE_STRIP");
        }
        else {
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override(color));
        }

        // descale model to avoid continuous size increase
        model_transform = model_transform.times(Mat4.scale(1, (2/3), 1));

        return model_transform;
    }

    display(context, program_state) {
        super.display(context, program_state);
        const blue = hex_color("#1a9ffa");
        let model_transform = Mat4.identity();
/*
        // draw 8 cubes
        for (let i = 0; i < 8; i++) {
            model_transform = this.draw_box(context, program_state, model_transform, this.colors[i], i);
        }

*/

        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: hex_color("#ff0000")}));

    }
}









