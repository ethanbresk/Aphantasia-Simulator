
import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
// import { Text_Line } from './examples/text-demo.js';
// import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class project extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
            sun: new defs.Subdivision_Sphere(4),
            planet1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            planet2: new defs.Subdivision_Sphere(3),
            planet3: new defs.Subdivision_Sphere(4),
            ring: new defs.Torus(50, 50),
            planet4: new defs.Subdivision_Sphere(4),
            moon: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            teapot: new Shape_From_File("assets/teapot.obj"),
            apple: new Shape_From_File("assets/apple.obj")

        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            sun: new Material(new defs.Phong_Shader(),
            {ambient: 1, diffusivity: 1, color: hex_color("#ffffff")}),
            planet1: new Material(new defs.Phong_Shader(),
            {ambient: 0, diffusivity: 1, color: hex_color("#9c9c9c"), specularity: 0}),
            planet2_gouraud: new Material(new Gouraud_Shader(),
                {ambient: 0, diffusivity: .2, color: hex_color("#80FFFF"), specularity: 1}),
            planet2_phong: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: .2, color: hex_color("#80FFFF"), specularity: 1}),
            planet3: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: 1, color: hex_color("#B08040"), specularity: 1}),
            planet4: new Material(new defs.Phong_Shader(),
                {ambient: 0, color: hex_color("#344ee3"), specularity: 1}), 
            moon: new Material(new defs.Phong_Shader(),
                {ambient: 0, diffusivity: .7, color: hex_color("#de0cfa"), specularity: 1}),  
            }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
    }
    
    display(context, program_state) {
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .1, 1000);
    
        const t = program_state.animation_time / 1000; // Get time in seconds
        let model_transform = Mat4.identity();
    
        // Sun transformation and drawing
        let sun_radius = 2 + Math.sin(2 * Math.PI / 10 * t);
        let sun_transform = model_transform.times(Mat4.scale(sun_radius, sun_radius, sun_radius));
        let rgb_value = (1 + Math.sin(2 * Math.PI / 10 * t)) / 2; 
        let sun_color = color(1, rgb_value, rgb_value, 1);
        program_state.lights = [new Light(vec4(0, 0, 0, 1), sun_color, 10 ** sun_radius)];
        this.shapes.sun.draw(context, program_state, sun_transform, this.materials.sun.override({color: sun_color}));
        this.shapes.apple.draw(context, program_state, sun_transform, this.materials.sun.override({color: sun_color}));
    
        // Planetary transformations and drawing
        // Note: The original 'draw_planets' logic is now integrated here
        let orbital_speed = t;
    
        // Planet 1
        //Gray, 2 subdivisions, flat shaded, diffuse only
        let planet1_transform = model_transform.times(Mat4.rotation(orbital_speed, 0, 1, 0)).times(Mat4.translation(5, 0, 0));
        this.shapes.apple.draw(context, program_state, planet1_transform, this.materials.planet1);
    
        // Planet 2
        //Swampy green-blue (suggest color #80FFFF ), 3 subdivisions, maximum specular, low diffuse. Apply Gouraud shading to it every odd second, but Phong shading every even second.
        let planet2_transform = model_transform.times(Mat4.rotation(orbital_speed / 2, 0, 1, 0)).times(Mat4.translation(8, 0, 0));
        if(Math.floor(t % 2) === 1) {
            this.shapes.apple.draw(context, program_state, planet2_transform, this.materials.planet2_gouraud);
        } else {
            this.shapes.apple.draw(context, program_state, planet2_transform, this.materials.planet2_phong);
        }
    
        // Planet 3
        //Muddy brown-orange (suggest color #B08040 ), 4 subdivisions, maximum diffuse and specular. The planet could (optionally) wobble on in its rotation over time (have an axis not the same as the orbit axis). The planet must have a ring. You can use the provided torus shape, scaled flatter (reduced z axis scale). The ring and planet must wobble together - so base the ring's matrix directly on the planet's matrix. Give the ring the same color as the planet and set the material ambient only (for now).
        let planet3_transform = model_transform.times(Mat4.rotation(orbital_speed / 3, 0, 1, 0)).times(Mat4.translation(11, 0, 0)).times(Mat4.rotation(Math.sin(t), 1, 0, 0));
        this.shapes.planet3.draw(context, program_state, planet3_transform, this.materials.planet3);
        let ring_transform = planet3_transform.times(Mat4.scale(3.5, 3.5, 0.1));
        this.shapes.ring.draw(context, program_state, ring_transform, this.materials.ring);
    
        // Planet 4
        //Soft light blue, 4 subdivisions, smooth phong, high specular. Add a moon for this planet. The moon has 1 subdivision, with flat shading, any material, and a small orbital distance around the planet
        let planet4_transform = model_transform.times(Mat4.rotation(orbital_speed / 5, 0, 1, 0)).times(Mat4.translation(14, 0, 0));
        this.shapes.planet4.draw(context, program_state, planet4_transform, this.materials.planet4);
    
        // Moon
        //1 subdivision, with flat shading, any material, and a small orbital distance around the planet.
        let moon_transform = planet4_transform.times(Mat4.rotation(t, 0, 1, 0)).times(Mat4.translation(-2, 0, 0));
        this.shapes.moon.draw(context, program_state, moon_transform, this.materials.moon);
    
        // Camera attachment logic remains unchanged
        if (this.attached !== undefined) {
            program_state.camera_inverse = this.attached().map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

         // Planet model matrices for camera buttons (5 units away from each planet)
         this.planet_1 = Mat4.inverse(planet1_transform.times(Mat4.translation(0, 0, 5)));
         this.planet_2 = Mat4.inverse(planet2_transform.times(Mat4.translation(0, 0, 5)));
         this.planet_3 = Mat4.inverse(planet3_transform.times(Mat4.translation(0, 0, 5)));
         this.planet_4 = Mat4.inverse(planet4_transform.times(Mat4.translation(0, 0, 5)));
         this.moon = Mat4.inverse(moon_transform.times(Mat4.translation(0, 0, 5)));

         
    }
    
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is exclusive and the minimum is inclusive
  }

}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            center = model_transform * vec4(0.0, 0.0, 0.0, 1.0);
            point_position = model_transform * vec4(position, 1.0);
            gl_Position = projection_camera_model_transform * vec4(position, 1.0); 
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            float scalar = sin(18.01 * distance(point_position.xyz, center.xyz));
            gl_FragColor = scalar * vec4(0.6078, 0.3961, 0.098, 1.0);
        }`;
    }
}





/*
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
            'sphere': new Sphere(12, 24),
            
           //teapot: new Shape_From_File("assets/teapot.obj")
           
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
    
        // draw 8 cubes
        for (let i = 0; i < 8; i++) {
            model_transform = this.draw_box(context, program_state, model_transform, this.colors[i], i);
        }



        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: hex_color("#ff0000")}));

        //this.shapes.teapot.draw(context, program_state, model_transform, this.materials.plastic.override({color: hex_color("#ff0000")}));


    }
}

*/




