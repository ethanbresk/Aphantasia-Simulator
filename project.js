
import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';
import { Text_Line } from './examples/text-demo.js';
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Texture, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class project extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.top_view_camera = false; // Flag to track camera mode: false for movable, true for top view

        this.object_queue = [];
        this.fish_to_draw = "nemo";
        this.points = 4;
        this.mouse_listener_added = false;
        this.coin_counter = 360;
        this.show_points_flag = false;

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            // basic shapes
            box: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(50, 50),
            square: new defs.Square(),

            // room assets
            aquarium: new Shape_From_File("assets/aquarium.obj"),
            table: new Shape_From_File("assets/table.obj"),

            // fish
            goldFish: new Shape_From_File("assets/goldfish.obj"),
            nemo: new Shape_From_File("assets/nemo.obj"),
            turtle: new Shape_From_File("assets/turtle.obj"),
            shark: new Shape_From_File("assets/shark.obj"),
            whale: new Shape_From_File("assets/whale.obj"),
            coin: new Shape_From_File("assets/coin.obj"),
            text: new Text_Line(35)
        };

        // textured phong
        const textured = new defs.Textured_Phong(1);

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#FFA500")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            water: new Material(textured, {
                ambient: .5,
                diffusivity: 1,
                specularity: 1,
                texture: new Texture("assets/water1.jpeg")
            }),
            aquarium: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: color(1, 1, 1, 0.5)}),
            // menu
            menu: new Material(textured,
                {ambient: 0.9, diffusivity: .9, specularity: 1, color: hex_color("#FFFFFF")}),
            menu_selected: new Material(textured,
                {ambient: 0.9, diffusivity: .9, specularity: 1, color: hex_color("#1303fc")}),
            shark: new Material(textured, {
                ambient: .5,
                diffusivity: 1,
                specularity: 1,
                texture: new Texture("assets/turtle_texture.jpg"),
                color: color(0.3, 0.3, 0.3, 1)
            }),
            whale: new Material(textured, {
                ambient: .5,
                diffusivity: 1,
                specularity: 1,
                texture: new Texture("assets/turtle_texture.jpg"),
                color: color(0.3, 0.45, 0.7, 1)


            }),
            turtle: new Material(textured, {
                ambient: 0.5,
                diffusivity: 1,
                specularity: 1,
                color: color(0, 0.5, 0, 1), // A green tone filter
                texture: new Texture("assets/turtle_texture.jpg")
            }),

            food_texture: new Material(textured, {
                ambient: .5,
                diffusivity: 0,
                specularity: 0,
                texture: new Texture("assets/food_texture.png")
            }),
            //menubuttons: new Material(textured,
            //{ambient: 0.9, diffusivity: 1, specularity: 1,  texture: new Texture("assets/bubble3.png")}),
            wood: new Material(textured, {
                ambient: 0.5,
                diffusivity: 0,
                specularity: 0,
                texture: new Texture("assets/wood2.jpg")
            }),
        }

        // object queue
        this.object_queue = [];

        // mouse position
        this.mousex;
        this.mousey;

        // To show text you need a Material like this one:
        this.text_image = new Material(textured, {
            ambient: 0.9, diffusivity: 0.9, specularity: 1,
            texture: new Texture("assets/text.png")
        });

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
        //this.initial_camera_location = Mat4.translation(5, -10, -30);

        this.materials.aquarium_glass = new Material(new defs.Phong_Shader(),
            {
                color: color(0.4, 0.5, 0.6, 0.1), // Adjust alpha for desired transparency
                ambient: 0.2, diffusivity: 0.5, specularity: 0.5
            });

        this.materials.aquarium_outline = new Material(new Frame_Shader(), {
            color: color(0, 0, 225, 225) // Black color for the outline
        });

        this.materials.aquarium_glass_far = new Material(new defs.Phong_Shader(), {
            color: color(0.4, 0.5, 0.6, 0.1), // Use a lower aslpha value for more transparency
            ambient: 0.2,
            diffusivity: 0.5,
            specularity: 0.5
        });


        this.materials.aquarium_glass = new Material(new defs.Textured_Phong(1), {
            texture: new Texture("assets/water1.png"),
            ambient: 0.2, diffusivity: 0.5, specularity: 0.5,
            color: color(1, 1, 1, 1) // Use white color to ensure the texture's colors are used accurately
        });


        this.materials.silver_material = new Material(new defs.Phong_Shader(),
            {ambient: 0.1, diffusivity: 0.2, specularity: 1, color: hex_color("#C0C0C0")});


    }

    draw_with_mouse(context, program_state) {

        let aquarium_bounds = {minX: -10, maxX: 10, minY: -5, maxY: 5, minZ: -10, maxZ: 10};

        let obj_color = color(Math.random(), Math.random(), Math.random(), 1.0);

        let obj_scale = 0.3; // Fixed scale for simplicity
        if (this.fish_to_draw === "nemo") { obj_scale = 0.2 }
        if (this.fish_to_draw === "turtle") { obj_scale = 0.5 }
        if (this.fish_to_draw === "shark") { obj_scale = 1 }
        if (this.fish_to_draw === "whale") { obj_scale = 4 }
        // Define movement attributes for the new fish

        // Position calculation as before
        let z_coord = Math.random() * (0.99 - 0.94) + 0.94;
        let pos_ndc_far = vec4(this.mousex, this.mousey, z_coord, 1.0);
        let P = program_state.projection_transform;
        let V = program_state.camera_inverse;
        let pos_world_far = Mat4.inverse(P.times(V)).times(pos_ndc_far);
        pos_world_far.scale_by(1 / pos_world_far[3]);
        const currentTime = program_state.animation_time;

        if (pos_world_far[0] >= aquarium_bounds.minX && pos_world_far[0] <= aquarium_bounds.maxX &&
            pos_world_far[1] >= aquarium_bounds.minY && pos_world_far[1] <= aquarium_bounds.maxY &&
            pos_world_far[2] >= aquarium_bounds.minZ && pos_world_far[2] <= aquarium_bounds.maxZ) {
            // The click is inside the aquarium; spawn the fish

            let direction = vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalized(); //Math.random()*2-1
            let speed = Math.random() * (0.5 - 0.05) + 0.1; // Adjusted speed for faster movement
            let rotation = Math.random() * 2 * Math.PI;

            let obj = {
                pos: pos_world_far, // Use the calculated world position
                color: obj_color,
                size: obj_scale,
                direction: direction,
                speed: speed,
                rotation: rotation,
                type: this.fish_to_draw,
                lastDuplicationTime: -Infinity,
            };

            if (this.fish_to_draw === "turtle") {
                obj.creationTime = currentTime;
            }

            let needed_points = 0;
            if (this.fish_to_draw === "nemo") { needed_points = 2 }
            if (this.fish_to_draw === "turtle") { needed_points = 5 }
            if (this.fish_to_draw === "shark") { needed_points = 20 }
            if (this.fish_to_draw === "whale") { needed_points = 100 }

            if ((this.points - needed_points) >= 0) {
                this.object_queue.push(obj);
                this.points -= needed_points;
            }
        }

    }


    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.

        this.control_panel.innerHTML += "Select type of fish to spawn:<br>";
        this.key_triggered_button("2p: Nemo", ["1"], () => this.set_fish_nemo());
        this.key_triggered_button("5p: Turtle", ["2"], () => this.set_fish_turtle());
        this.key_triggered_button("20p: Shark", ["3"], () => this.set_fish_shark());
        this.key_triggered_button("100p: Whale", ["4"], () => this.set_fish_whale());
        this.new_line();
        this.new_line();
        this.live_string(box => box.textContent = "Functionality controls:");
        this.new_line();
        this.key_triggered_button("Refund last fish", ["q"], () => this.delete_last_fish());
        this.new_line();
        this.key_triggered_button("Toggle top view camera", ["c"], () => {
            this.top_view_camera = !this.top_view_camera; // Toggle the camera mode
            if (this.top_view_camera) {
                program_state.set_camera(Mat4.look_at(vec3(0, 30, 0.1), vec3(0, 0, 0), vec3(0, 0, -1))); // Top view camera
            } else {
                program_state.set_camera(this.initial_camera_location); // Reset to the initial camera location for a movable view
            }
        });
        this.key_triggered_button("Show/Hide Points", ["l"], () => {
            this.show_points_flag = !this.show_points_flag;
        });

        // Lifespan adjustment buttons
        // this.control_panel.appendChild(document.createTextNode("Turtle Lifespan (seconds): "));
        // this.key_triggered_button("-5s", ["-"], () => {
        //     this.turtleLifespan = Math.max(5000, this.turtleLifespan - 5000); // Minimum of 5 seconds
        //     console.log(`Turtle Lifespan: ${this.turtleLifespan / 1000} seconds`);
        // });
        // this.key_triggered_button("+5s", ["+"], () => {
        //     this.turtleLifespan += 5000; // Increase lifespan by 5 seconds
        //     console.log(`Turtle Lifespan: ${this.turtleLifespan / 1000} seconds`);
        // });

    }

    delete_last_fish() {
        for (let i = this.object_queue.length-1; i >= 0; i--) {
            if (this.object_queue[i].type === "coin") continue;
            else {
                if (this.object_queue[i].type === "nemo") { this.points += 2 }
                if (this.object_queue[i].type === "turtle") { this.points += 5 }
                if (this.object_queue[i].type === "shark") { this.points += 20 }
                if (this.object_queue[i].type === "whale") { this.points += 100 }
                this.object_queue.splice(i, 1); // Remove fish at index
                break;
            }
        }
    }

    set_fish_nemo() {
        this.fish_to_draw = "nemo";
    }
    set_fish_turtle() {
        this.fish_to_draw = "turtle";
    }
    set_fish_shark() {
        this.fish_to_draw = "shark";
    }
    set_fish_whale() {
        this.fish_to_draw = "whale";
    }



    update_fish(context, program_state) {
        const collision_threshold = 0.8; // Adjust based on your scene scale
        const sharkCollectionThreshold = 4; // Increased threshold for sharks
        const turtleCollectionThreshold = 1;
        const whaleCollectionThreshold = 8;
        const currentTime = program_state.animation_time; // Current time in milliseconds
        const movementRandomizationInterval = 5; // Interval to randomize movement again, in seconds
    
        let fishToRemove = []; // Hold fish that will be removed due to collisions

        this.object_queue.forEach((obj, index) => {
            // Exclude coins from random movement, but still move them and check boundaries
            if (obj.type !== "coin") {
                // Randomize movement for each fish or turtle at defined intervals
                if (!obj.lastRandomizationTime || currentTime - obj.lastRandomizationTime > movementRandomizationInterval * 1000) {
                    obj.direction = vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalized();
                    obj.speed = Math.random() * 0.05 + 0.01; // Vary speed within a range
                    obj.rotation = Math.atan2(obj.direction[1], obj.direction[0]); // Update rotation based on direction
                    obj.lastRandomizationTime = currentTime;
                }
    
                // Introduce slight variation in direction and speed for more dynamic movement
                if (Math.random() < 0.3) { // 30% chance every frame to slightly alter direction and speed
                    let directionChange = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalized().times(0.2);
                    obj.direction = obj.direction.plus(directionChange).normalized();
                    obj.speed = Math.random() * 0.2 + 0.05;  
                    obj.rotation = Math.atan2(obj.direction[1], obj.direction[0]);
                }
                
     
            }
            
            // Move objects based on their speed and direction
            obj.pos = obj.pos.plus(obj.direction.times(obj.speed * program_state.animation_delta_time / 1000));
       
        });

        // Check for collisions between objects and adjust for aquarium bounds for all objects, including coins
        const aquariumBounds = { minX: -9.5, maxX: 9.5, minY: -4.2, maxY: 4.7, minZ: -9.5, maxZ: 9.5 };
        const whaleBounds = {
            minX: aquariumBounds.minX + 3, // Adjust these values to make the bounds smaller for the whale
            maxX: aquariumBounds.maxX - 3,
            minY: aquariumBounds.minY + 1,
            maxY: aquariumBounds.maxY - 1,
            minZ: aquariumBounds.minZ + 3,
            maxZ: aquariumBounds.maxZ - 3,
        };
        
        this.object_queue.forEach((obj, index) => {
            
            for (let j = index + 1; j < this.object_queue.length; j++) {
                const other = this.object_queue[j];
                const distance = obj.pos.minus(other.pos).norm();
                let creatureCollectionThreshold = obj.type === "shark" ? sharkCollectionThreshold : obj.type === "turtle" ? turtleCollectionThreshold : obj.type === "whale" ? whaleCollectionThreshold : collision_threshold;
                if (distance < creatureCollectionThreshold) {
                    // Determine action based on object types
                    if (obj.type === "coin" && other.type !== "coin") {
                        fishToRemove.push(index);
                        this.points += (other.type === "turtle") ? 2 : (other.type === "shark") ? 4 : (other.type === "whale") ? 20 : 1;
                    } else if (other.type === "coin" && obj.type !== "coin") {
                        fishToRemove.push(j);
                        this.points += (obj.type === "turtle") ? 2 : (obj.type === "shark") ? 4 : (obj.type === "whale") ? 20 : 1;
                    }
                }
            }
            // Boundary check for all objects, including coins
            if (obj.type === "whale") {
                if (obj.pos[0] < whaleBounds.minX || obj.pos[0] > whaleBounds.maxX) obj.direction[0] *= -1;
                if (obj.pos[1] < whaleBounds.minY || obj.pos[1] > whaleBounds.maxY) obj.direction[1] *= -1;
                if (obj.pos[2] < whaleBounds.minZ || obj.pos[2] > whaleBounds.maxZ) obj.direction[2] *= -1;
            } else {
                // Keep original bounds for other objects
                if (obj.pos[0] < aquariumBounds.minX || obj.pos[0] > aquariumBounds.maxX) obj.direction[0] *= -1;
                if (obj.pos[1] < aquariumBounds.minY || obj.pos[1] > aquariumBounds.maxY) obj.direction[1] *= -1;
                if (obj.pos[2] < aquariumBounds.minZ || obj.pos[2] > aquariumBounds.maxZ) obj.direction[2] *= -1;
            }

            
    
            // Specifically for coins, move them based on their speed and direction
            if (obj.type === "coin") {
                obj.pos = obj.pos.plus(obj.direction.times(obj.speed * program_state.animation_delta_time / 1000));
            }
        });
    
        // Remove collided or collected objects
        fishToRemove = [...new Set(fishToRemove)].sort((a, b) => b - a); // Remove duplicates and sort in descending order for safe removal
        fishToRemove.forEach(index => this.object_queue.splice(index, 1));
    }
    
    // update_fish(context, program_state) {
    //     const collision_threshold = 0.8; // Adjust based on your scene scale
    //     let new_fish = []; // Temporarily hold new fish to add after checking all collisions
    //     const fishCooldownPeriod = 2000; // Cooldown period for fish in milliseconds
    //     const currentTime = program_state.animation_time; // Current time in milliseconds
    //     const turtleLifetime = 10000;


    //     // Filter out turtles that have exceeded their lifetime
    //     this.object_queue = this.object_queue.filter(obj => {
    //         // if (obj.type === "turtle" && currentTime - obj.creationTime > turtleLifetime) {
    //         //     return false; // Remove expired turtles
    //         // }
    //         return true;
    //     });

    //     // Initialize an array to hold fish that will be removed due to collisions with turtles
    //     let fishToRemove = [];

    //     for (let i = 0; i < this.object_queue.length; i++) {
    //         const obj = this.object_queue[i];
    //         if (currentTime - obj.lastDuplicationTime < fishCooldownPeriod) {
    //             continue; // Skip if still in cooldown
    //         }

    //         for (let j = i + 1; j < this.object_queue.length; j++) {
    //             const fish1 = this.object_queue[i];
    //             const fish2 = this.object_queue[j];
    //             const distance = fish1.pos.minus(fish2.pos).norm();

    //             if (distance < collision_threshold && currentTime - fish2.lastDuplicationTime >= fishCooldownPeriod) {
    //                 // If a turtle collides with a fish, mark the fish for removal
    //                 if (fish1.type === "coin" && fish2.type !== "coin") {
    //                     fishToRemove.push(i); // Mark fish2 for removal
    //                     this.points += 1;
    //                 } else if (fish2.type === "coin" && fish1.type !== "coin") {
    //                     fishToRemove.push(j); // Mark fish1 for removal
    //                     this.points += 1;
    //                 }
    //                 //duplication removed
    //                 /*
    //                 else {
    //                     // Handle duplication logic here (similar to previous implementation)
    //                     let newObject = {
    //                         ...fish1,
    //                         pos: fish1.pos.plus(vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)),
    //                         direction: vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalized(),
    //                         lastDuplicationTime: currentTime,
    //                     };


    //                     if (fish1.type === "turtle") {
    //                         newObject.creationTime = currentTime; // For new turtles
    //                     }

    //                     new_fish.push(newObject);
    //                     fish1.lastDuplicationTime = currentTime;
    //                     fish2.lastDuplicationTime = currentTime;


    //                 }
    //                 */
    //             }
    //         }
    //     }

    //     // Remove fish that collided with turtles
    //     fishToRemove = [...new Set(fishToRemove)]; // Remove duplicates
    //     fishToRemove.sort((a, b) => b - a); // Sort in descending order for safe removal
    //     for (let index of fishToRemove) {
    //         this.object_queue.splice(index, 1); // Remove fish at index
    //     }

    //     // Add new fish (or turtles) to the object queue
    //     this.object_queue = [...this.object_queue, ...new_fish];
    // }

    
    update_sharks_and_coins(context, program_state) {
        const randomMovementInterval = 2000; // Interval for random movement direction change, in milliseconds
        const centerMovementInterval = 10000; // Interval for moving towards the center, in milliseconds
        const currentTime = program_state.animation_time; // Current time in milliseconds
        const tankCenter = vec3(0, 0, 0); // Assuming the center of your tank is at the origin
        const aquariumBounds = {
            minX: -9.7, maxX: 9.7,
            minY: -4.7, maxY: 4.7,
            minZ: -9.7, maxZ: 9.7
        };

        this.object_queue.forEach((obj, index) => {


            if (obj.type === "shark" || obj.type === "turtle" || obj.type === "coin" || obj.type === "nemo" || obj.type === "whale") {

                 // Ensure objects stay within bounds
                 if (obj.pos[0] < aquariumBounds.minX) {
                    obj.pos[0] = aquariumBounds.minX;
                    obj.direction[0] = -obj.direction[0];
                } else if (obj.pos[0] > aquariumBounds.maxX) {
                    obj.pos[0] = aquariumBounds.maxX;
                    obj.direction[0] = -obj.direction[0];
                }
    
                if (obj.pos[1] < aquariumBounds.minY) {
                    obj.pos[1] = aquariumBounds.minY;
                    obj.direction[1] = -obj.direction[1];
                } else if (obj.pos[1] > aquariumBounds.maxY) {
                    obj.pos[1] = aquariumBounds.maxY;
                    obj.direction[1] = -obj.direction[1];
                }
    
                if (obj.pos[2] < aquariumBounds.minZ) {
                    obj.pos[2] = aquariumBounds.minZ;
                    obj.direction[2] = -obj.direction[2];
                } else if (obj.pos[2] > aquariumBounds.maxZ) {
                    obj.pos[2] = aquariumBounds.maxZ;
                    obj.direction[2] = -obj.direction[2];
                }



            }
            if (obj.type === "shark" || obj.type === "turtle" || obj.type === "coin" || obj.type === "nemo") {
                // Movement and behavior logic unchanged, see previous implementation...
                
                // Ensure objects stay within bounds
                if (obj.pos[0] < aquariumBounds.minX) {
                    obj.pos[0] = aquariumBounds.minX;
                    obj.direction[0] = -obj.direction[0];
                } else if (obj.pos[0] > aquariumBounds.maxX) {
                    obj.pos[0] = aquariumBounds.maxX;
                    obj.direction[0] = -obj.direction[0];
                }
    
                if (obj.pos[1] < aquariumBounds.minY) {
                    obj.pos[1] = aquariumBounds.minY;
                    obj.direction[1] = -obj.direction[1];
                } else if (obj.pos[1] > aquariumBounds.maxY) {
                    obj.pos[1] = aquariumBounds.maxY;
                    obj.direction[1] = -obj.direction[1];
                }
    
                if (obj.pos[2] < aquariumBounds.minZ) {
                    obj.pos[2] = aquariumBounds.minZ;
                    obj.direction[2] = -obj.direction[2];
                } else if (obj.pos[2] > aquariumBounds.maxZ) {
                    obj.pos[2] = aquariumBounds.maxZ;
                    obj.direction[2] = -obj.direction[2];
                }

                if (obj.type === "shark" || obj.type === "turtle" || obj.type == "nemo") {
        
                    // Periodically change movement direction to simulate more active movement around the tank
                    if (!obj.lastRandomMovementTime || currentTime - obj.lastRandomMovementTime >= randomMovementInterval) {
                        obj.direction = vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalized();
                        obj.lastRandomMovementTime = currentTime;
                    }
        
                    // Occasionally direct movement towards the center of the tank
                    if (!obj.lastCenterMovementTime || currentTime - obj.lastCenterMovementTime >= centerMovementInterval) {
                        obj.direction = tankCenter.minus(obj.pos).normalized();
                        obj.lastCenterMovementTime = currentTime;
                    }
        
                    // Set speed: make turtles move faster than sharks
                    obj.speed = obj.type === "turtle" ? 1 : obj.type === "nemo" ? .3 : 0.5; // Increased turtle speed
        
                    // Move objects based on their speed and direction
                    obj.pos = obj.pos.plus(obj.direction.times(obj.speed * program_state.animation_delta_time / 1000));
                    
                    // Rotate object towards its movement direction
                    obj.rotation = Math.atan2(obj.direction[1], obj.direction[0]);
        


                }
            }
        });
    }
    



    


    display(context, program_state) {
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            program_state.set_camera(this.initial_camera_location);
        }

        if (this.show_points_flag) {
            // Display points
            let text_transform = Mat4.identity().times(Mat4.translation(-5, 6, -11, 0));
            // Set the string to the current points value
            this.shapes.text.set_string("Points: " + this.points.toString(), context.context);
            // Draw the text
            this.shapes.text.draw(context, program_state, text_transform, this.text_image);
        }


        if (this.top_view_camera) {
            let top_view_camera_position = vec3(0, 30, 17);
            let looking_at_point = vec3(0, 1, 0);
            let up_direction = vec3(0, 0, -1);
            program_state.set_camera(Mat4.look_at(top_view_camera_position, looking_at_point, up_direction));
            // Display points
            let text_transform = Mat4.identity().times(Mat4.translation(-5,6,-11,0))
            // Sample the "strings" array and draw them onto a cube.
            //this.shapes.text.set_string("Points:" + this.points.toString(), context.context);
            this.shapes.text.set_string("Points: " + this.points.toString(), context.context);
            this.shapes.text.draw(context, program_state, text_transform, this.text_image);
        } else {
            program_state.set_camera(this.initial_camera_location);
        }

        // Decide which material to use based on the top_view_camera flag
        let aquarium_material = this.top_view_camera ? this.materials.aquarium_glass : this.materials.aquarium_glass;

        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000; // Get time in seconds
        let model_transform = Mat4.identity();

        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let table_transform = model_transform
            .times(Mat4.scale(8, 8, 8))
        //.times(Mat4.rotation(90,0,1,0))
        // this.shapes.square.draw(context, program_state, table_transform, this.materials.water);


        //this.shapes.aquarium.draw(context, program_state, aquarium_transform, this.materials.aquarium);
        //context.gl.depthMask(true);

        let nemo_transform = Mat4.identity()
            .times(Mat4.translation(0, 2, 0)) // Move to the aquarium's position
            .times(Mat4.scale(5, 5, 5)) // Apply the same scale as the aquarium to ensure consistent positioning
            .times(Mat4.translation(2, 2.5, 1)) // Move nemo inside the aquarium. Adjust these values as needed.
            .times(Mat4.scale(0.1, 0.1, 0.1)); // Scale down nemo if necessary

        //this.shapes.nemo.draw(context, program_state, nemo_transform, this.materials.test);

        const dt = program_state.animation_delta_time / 1000; // Delta time in seconds

        if (!this.mouse_listener_added) {
            let canvas = context.canvas;
            const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
                vec((e.clientX - (rect.left + rect.right) / 2) / ((rect.right - rect.left) / 2),
                    (e.clientY - (rect.bottom + rect.top) / 2) / ((rect.top - rect.bottom) / 2));
 
        
            canvas.addEventListener("contextmenu", e => {
                e.preventDefault();
                this.mousex = mouse_position(e)[0];
                this.mousey = mouse_position(e)[1];
                this.draw_with_mouse(context, program_state);
            });

            this.mouse_listener_added = true; // Set the flag to true
        }
        const aquarium_bounds = {
            minX: -9.7, maxX: 9.7,
            minY: -4.7, maxY: 4.7,
            minZ: -9.7, maxZ: 9.7
        };

        // Update and draw each fish
        this.object_queue.forEach(obj => {


            // Check boundaries and reflect direction if hitting a wall
            if (obj.pos[0] < aquarium_bounds.minX || obj.pos[0] > aquarium_bounds.maxX) {
                obj.direction[0] *= -1;
            }
            if (obj.pos[1] < aquarium_bounds.minY || obj.pos[1] > aquarium_bounds.maxY) {
                obj.direction[1] *= -1;
            }
            if (obj.pos[2] < aquarium_bounds.minZ || obj.pos[2] > aquarium_bounds.maxZ) {
                obj.direction[2] *= -1;
            }

            // Update position with possibly adjusted direction
            obj.pos = obj.pos.plus(obj.direction.times(obj.speed * dt));

            // Prepare transformation matrix for the fish
            let transform = Mat4.translation(...obj.pos.to3())
                .times(Mat4.rotation(obj.rotation, 0, 1, 0)) // Apply rotation
                .times(Mat4.scale(obj.size, obj.size, obj.size)); // Apply scale
           
            // Draw the fish
            if (obj.type === "nemo") {
                this.shapes.nemo.draw(context, program_state, transform, this.materials.test)

                this.pos_vec = vec4(obj.pos[0], obj.pos[1], obj.pos[2], 1)
                let P = program_state.projection_transform;
                let V = program_state.camera_inverse;
                let P_times_V = Mat4.inverse(P.times(V));
                let pos_ndc_far = P_times_V.times(this.pos_vec);

                //console.log("pos: " + pos_ndc_far + " x:" + this.mousex + " y:" + this.mousey)
            }
            else if (obj.type === "turtle") {
                transform = transform.times(Mat4.rotation(Math.PI / 1, 0, Math.PI / 2, 1));
                this.shapes.turtle.draw(context, program_state, transform, this.materials.turtle)
            }
            else if (obj.type === "shark") {
                transform = transform.times(Mat4.rotation(Math.PI / 1, 0, Math.PI / 2, 1));
                this.shapes.shark.draw(context, program_state, transform, this.materials.shark)
            }
            else if (obj.type === "whale") {
                transform = transform.times(Mat4.rotation(Math.PI, 0, Math.PI / 4, 1));
                this.shapes.whale.draw(context, program_state, transform, this.materials.whale)
            }
            else if (obj.type === "coin") {
                transform = transform.times(Mat4.rotation(Math.PI / 1, 0, 1, 1))
                this.shapes.sphere.draw(context, program_state, transform, this.materials.menu_selected)
            }
        });

        this.update_fish(context, program_state);
        this.update_sharks_and_coins(context, program_state);

        //this.update_aquarium_creatures(context, program_state);
        const gl = context.context || context; // Get the WebGL context


        let aquarium_transform = Mat4.identity();
        aquarium_transform = aquarium_transform.times(Mat4.translation(0, 0, 0)); // Adjust position
        aquarium_transform = aquarium_transform.times(Mat4.scale(10, 5, 10)); // Adjust size


        // Enable blending
        gl.enable(gl.BLEND);
        // Set blending to interpolate towards a fixed alpha value
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let outline_transform = aquarium_transform.times(Mat4.scale(1.05, 1.05, 1.05)); // Scale up for outline
        //this.shapes.box.draw(context, program_state, outline_transform, this.materials.aquarium_outline);

        // Enable blending for transparency effects
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.shapes.box.draw(context, program_state, aquarium_transform, aquarium_material);

        let base_transform = Mat4.translation(0, -5 - 0.55, 0) // Move base slightly below the aquarium, adjust Y translation considering the new thickness
            .times(Mat4.scale(11.2, 0.5, 11.2)); // Make the base slightly larger and thicker than before
        // Draw the base
        this.shapes.box.draw(context, program_state, base_transform, this.materials.silver_material);

        // Draw the floor
        let floor_transform = Mat4.translation(0, -6 - 0.55, 0)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(20, -6 - 0.55, 20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(0, -6 - 0.55, 20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(0, -6 - 0.55, -20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-20, -6 - 0.55, -20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-20, -6 - 0.55, 20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(20, -6 - 0.55, -20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(20, -6 - 0.55, 0)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-20, -6 - 0.55, 0)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-40, -6 - 0.55, 0)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(40, -6 - 0.55, 0)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(0, -6 - 0.55, -40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(0, -6 - 0.55, 40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(40, -6 - 0.55, 40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-40, -6 - 0.55, 40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(40, -6 - 0.55, -40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-40, -6 - 0.55, -40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-40, -6 - 0.55, -20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-40, -6 - 0.55, 20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(40, -6 - 0.55, -20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(40, -6 - 0.55, 20)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(20, -6 - 0.55, -40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(20, -6 - 0.55, 40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-20, -6 - 0.55, -40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);
        floor_transform = Mat4.translation(-20, -6 - 0.55, 40)
            .times(Mat4.scale(10, 0.5, 10));
        this.shapes.box.draw(context, program_state, floor_transform, this.materials.wood);

        // Pillar dimensions
        let pillar_height = 5.4;
        let pillar_radius = .5;
        let base_height = -5 - 0.55; // The Y position of the base

        // Pillar positions based on the base size, considering pillars are at the corners
        let positions = [
            vec3(-10, base_height, 10),
            vec3(10, base_height, 10),
            vec3(-10, base_height, -10),
            vec3(10, base_height, -10),
        ];

        // Draw each pillar
        positions.forEach(position => {
            let pillar_transform = Mat4.translation(...position)
                .times(Mat4.translation(0, pillar_height * 2 / 2, 0)) // Move up so the base of the pillar is at the specified position
                .times(Mat4.scale(pillar_radius, pillar_height, pillar_radius));
            this.shapes.box.draw(context, program_state, pillar_transform, this.materials.silver_material);
        });

    
        // Randomly spawn coins
        this.coin_counter -= 1;
        if (this.coin_counter === 0) {

            let obj_color = color(Math.random(), Math.random(), Math.random(), 1.0);
            let obj_scale = 0.25; // Fixed scale for simplicity
            var x_coord = Math.ceil(Math.random()) * (Math.round(Math.random()) ? 1 : -1)
            var y_coord = Math.ceil(Math.random()) * (Math.round(Math.random()) ? 1 : -1)
            let z_coord = Math.random() * (0.99 - 0.94) + 0.94;
            let pos_ndc_far = vec4(x_coord, y_coord, z_coord, 1.0);
            let P = program_state.projection_transform;
            let V = program_state.camera_inverse;
            let pos_world_far = vec4(x_coord, y_coord, z_coord, 1.0);
            pos_world_far.scale_by(1 / pos_world_far[3]);
            const currentTime = program_state.animation_time;

            let direction = vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalized(); //Math.random()*2-1
            let speed = Math.random() * (4 - 2) + 2; // Adjusted speed for faster movement
            let rotation = 1 * Math.PI;

            let obj = {
                pos: pos_world_far, // Use the calculated world position
                color: obj_color,
                size: obj_scale,
                direction: direction,
                speed: speed,
                rotation: rotation,
                type: "coin",
                lastDuplicationTime: -Infinity,
            };

            this.object_queue.push(obj);
            this.coin_counter = 360;
        }


        // Optionally, disable blending if it's not needed for subsequent drawing operations
        gl.disable(gl.BLEND);
    }

    draw_menu(context, program_state, model_transform) {

        // draw item 1: floral coral
        var item1_circle_trans = model_transform.times(Mat4.translation(-6, 3, 0, 0))
            .times(Mat4.scale(0.6, 0.6, 0.5, 0));

        // get position of item 1 button
        let button1x = ((item1_circle_trans[0][3]) - (-5)) / 22.5;
        let button1y = (item1_circle_trans[1][3] - (10.5)) / 12;

        // check if mouse click on item 1 button
        if ((this.mousex < button1x + 0.1 && this.mousex > button1x - 0.1) && (this.mousey < button1y + 0.12 && this.mousey > button1y - 0.1) && (this.sand_dollars - price1 >= 0)) {
            // if clicked --> animate item so that we know it is clicked
            this.shapes.circle.draw(context, program_state, item1_circle_trans, this.materials.menu_selected);

            // draw item on next mouse click
            this.fish_to_draw = "nemo";
        } else {
            this.shapes.circle.draw(context, program_state, item1_circle_trans, this.materials.menu_selected);
        }

        let item1_trans = item1_circle_trans.times(Mat4.translation(0.2, -0.1, 0.3, 0))
            .times(Mat4.scale(0.35, 0.35, 1, 0))
            .times(Mat4.rotation(-43.9, 0, 0, 1));
        this.shapes.nemo.draw(context, program_state, item1_trans, this.materials.test);

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



class Frame_Shader extends Shader {
    constructor() {
        super();
    }

    shared_glsl_code() {
        return `precision mediump float;`;
    }

    vertex_glsl_code() {
        return `
            attribute vec3 position;
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;

            void main() {
                gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            }
        `;
    }

    fragment_glsl_code() {
        return `
            uniform vec4 outline_color;

            void main() {
                gl_FragColor = outline_color; // Use the uniform color for the outline
            }
        `;
    }

    // Overriding the method that sends graphics state and material to the GPU:
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
        // Call parent class's update method
        super.update_GPU(context, gpu_addresses, program_state, model_transform, material);

        // Set the outline color
        const gl = context.context || context;
        gl.uniform4fv(gpu_addresses.outline_color, material.color);
    }
}