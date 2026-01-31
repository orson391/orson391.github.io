class Shader{
    webglInstance;
    shaders = [];

    constructor(gl){
        this.webglInstance = gl;
        this.program = gl.createProgram();
    }

    addShader(type, source){
        const shader = this.webglInstance.createShader(type);
        this.webglInstance.createShader(type);
        this.webglInstance.shaderSource(shader, source);
        this.webglInstance.compileShader(shader);

        if(!this.webglInstance.getShaderParameter(shader, this.webglInstance.COMPILE_STATUS)){
            console.error("Error compiling shader:", this.webglInstance.getShaderInfoLog(shader));
            this.webglInstance.deleteShader(shader);
            return;
        }

        this.webglInstance.attachShader(this.program, shader);
        this.shaders.push(shader);
    }

    link(){
        this.webglInstance.linkProgram(this.program);
        if(!this.webglInstance.getProgramParameter(this.program, this.webglInstance.LINK_STATUS)){
            console.error("Error linking program:", this.webglInstance.getProgramInfoLog(this.program));
            this.webglInstance.deleteProgram(this.program);
            return;
        }
    }

    use(){
        this.webglInstance.useProgram(this.program);
    }

    dispose(){
        for(const shader of this.shaders){
            this.webglInstance.detachShader(this.program, shader);
            this.webglInstance.deleteShader(shader);
        }
        this.webglInstance.deleteProgram(this.program);
    }

    #getLocation(name){

        return this.webglInstance.getUniformLocation(this.program, name);
    }

    setUniformInteger(name, value){
        const location = this.#getLocation(name);
        this.webglInstance.uniform1i(location, value);
    }

    setUniformFloat(name, value){
        const location = this.#getLocation(name);
        this.webglInstance.uniform1f(location, value);
    }

    setUniformVector3(name, vector){
        const location = this.#getLocation(name);
        this.webglInstance.uniform3fv(location, vector);
    }

    setUniformMatrix4(name, matrix){
        const location = this.#getLocation(name);
        this.webglInstance.uniformMatrix4fv(location, false, matrix);
    }
}

class ShaderManager{
    webglInstance;
    shaders = new Map();

    constructor(gl){
        this.webglInstance = gl;
    }

    createShader(name, vertexSource, fragmentSource){
        const shader = new Shader(this.webglInstance);
        shader.addShader(this.webglInstance.VERTEX_SHADER, vertexSource);
        shader.addShader(this.webglInstance.FRAGMENT_SHADER, fragmentSource);
        shader.link();
        this.shaders.set(name, shader);
        return shader;
    }

    getShader(name){
        return this.shaders.get(name);
    }

    dispose(){
        for(const shader of this.shaders.values()){
            shader.dispose();
        }
        this.shaders.clear();
    }
}

class Texture2D{
    webglInstance;
    texture;

    constructor(gl){
        this.webglInstance = gl;
        this.texture = this.webglInstance.createTexture();
    }

    bind(unit = 0){
        this.webglInstance.activeTexture(this.webglInstance.TEXTURE0 + unit);
        this.webglInstance.bindTexture(this.webglInstance.TEXTURE_2D, this.texture);
    }

    setParameters(params){
        for(const [pname, param] of Object.entries(params)){
            this.webglInstance.texParameteri(this.webglInstance.TEXTURE_2D, this.webglInstance[pname], param);
        }
    }

    uploadImage(image){
        this.webglInstance.texImage2D(this.webglInstance.TEXTURE_2D, 0, this.webglInstance.RGBA, this.webglInstance.RGBA, this.webglInstance.UNSIGNED_BYTE, image);
    }

    dispose(){
        this.webglInstance.deleteTexture(this.texture);
    }
}

class CubeMap{
    webglInstance;
    texture;

    constructor(gl){
        this.webglInstance = gl;
        this.texture = this.webglInstance.createTexture();
    }

    bind(unit = 0){
        this.webglInstance.activeTexture(this.webglInstance.TEXTURE0 + unit);
        this.webglInstance.bindTexture(this.webglInstance.TEXTURE_CUBE_MAP, this.texture);
    }

    setParameters(params){
        for(const [pname, param] of Object.entries(params)){
            this.webglInstance.texParameteri(this.webglInstance.TEXTURE_CUBE_MAP, this.webglInstance[pname], param);
        }
    }

    uploadImages(images){
        const targets = [
            this.webglInstance.TEXTURE_CUBE_MAP_POSITIVE_X,
            this.webglInstance.TEXTURE_CUBE_MAP_NEGATIVE_X,
            this.webglInstance.TEXTURE_CUBE_MAP_POSITIVE_Y,
            this.webglInstance.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            this.webglInstance.TEXTURE_CUBE_MAP_POSITIVE_Z,
            this.webglInstance.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        ];

        for(let i = 0; i < targets.length; i++){
            this.webglInstance.texImage2D(targets[i], 0, this.webglInstance.RGB, this.webglInstance.RGB, this.webglInstance.UNSIGNED_BYTE, images[i]);
        }
    }

    dispose(){
        this.webglInstance.deleteTexture(this.texture);
    }
}   

const world = {
    width: 800,
    height: 600,
    fov: 45.0,
    near: 0.1,
    far: 100.0,
};

const config = {
    use_color: 1,
    color: [0.0, 0.0, 0.0]
}

function draw(gl, shader, vertexConfiguration){


    const time = performance.now() * 0.001;
    
    const model = mat4.create();
    mat4.scale(model, model, [0.5, 0.5, 0.5]);
    mat4.rotateY(model, model, time);

    const projection = mat4.create();
    mat4.perspective(projection, glMatrix.toRadian(world.fov), world.width / world.height, world.near, world.far);

    const view = mat4.create();
    mat4.lookAt(view, [0, 0, -5], [0, 0, 0], [0, 2, 0]);

    shader.use();
    shader.setUniformMatrix4("model", model);
    shader.setUniformMatrix4("projection", projection);
    shader.setUniformMatrix4("view", view);

    shader.setUniformVector3("color", config.color);
    shader.setUniformInteger("use_cube_map", config.use_color === 1 ? 0 : 1);
    shader.setUniformInteger("cube_map", 0);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.bindVertexArray(vertexConfiguration);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    requestAnimationFrame(() => draw(gl, shader, vertexConfiguration));
};

document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("my_canvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        console.error("WebGL2 is not supported by your browser.");
        return;
    }

    window.addEventListener("resize", function(e) {
        const dpr = window.devicePixelRatio || 1;

        const displayWidth  = Math.floor(canvas.clientWidth  * dpr);
        const displayHeight = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width  = displayWidth;
            canvas.height = displayHeight;

            gl.viewport(0, 0, displayWidth, displayHeight);

            world.width  = displayWidth;
            world.height = displayHeight;
        }
    });

    canvas.addEventListener("wheel", function(e) {
        e.preventDefault();
        world.fov -= e.deltaY * 0.01;

        if (world.fov < 1.0) world.fov = 1.0;
        if (world.fov > 90.0) world.fov = 90.0;

    }, { passive: false });

    document.getElementById("color_picker").addEventListener("input", function(e) {
        const hex = e.target.value;
        config.color = [
            parseInt(hex.slice(1, 3), 16) / 255,
            parseInt(hex.slice(3, 5), 16) / 255,
            parseInt(hex.slice(5, 7), 16) / 255
        ];
    });

    document.getElementById("use_color").addEventListener("change", function(e) {
        config.use_color = e.target.checked ? 1 : 0;
    });

    const vertex_shader = 
    `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 a_position;

    uniform mat4 model;
    uniform mat4 projection;
    uniform mat4 view;

    out vec3 fragment_position;

    void main() {
        gl_Position = projection * view * model * vec4(a_position, 1.0);
        fragment_position = a_position;
    }
    `;

    const fragment_shader = 
    `#version 300 es
    precision mediump float;
    
    in vec3 fragment_position;

    uniform vec3 color;
    uniform samplerCube cube_map;
    uniform int use_cube_map;

    out vec4 fragColor;
    
    void main() {
        if(use_cube_map == 1){
            fragColor = texture(cube_map, fragment_position);
        } else {
            fragColor = vec4(color, 1.0);
        }
    }
    `;

    const shaderManager =  new ShaderManager(gl);
    const shaderr = shaderManager.createShader("basic", vertex_shader, fragment_shader);

    const cube_vertices = new Float32Array([
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0, -1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
    ]);


    const vertexConfig = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    gl.bindVertexArray(vertexConfig);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube_vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    
   const faceImages = [];
    const faceUrls = [
    'static/images/mulli1.jpg',
    'static/images/mulli1.jpg',
    'static/images/mulli1.jpg',
    'static/images/mulli1.jpg',
    'static/images/mulli1.jpg',
    'static/images/mulli1.jpg',
    ];

    let imagesLoaded = 0;

    cubeMap = new CubeMap(gl);
    cubeMap.bind(0);
    cubeMap.setParameters({
    TEXTURE_MIN_FILTER: gl.LINEAR,
    TEXTURE_MAG_FILTER: gl.LINEAR,
    TEXTURE_WRAP_S: gl.CLAMP_TO_EDGE,
    TEXTURE_WRAP_T: gl.CLAMP_TO_EDGE,
    TEXTURE_WRAP_R: gl.CLAMP_TO_EDGE,
    });

    for (let i = 0; i < faceUrls.length; i++) {
    const image = new Image();
    image.src = faceUrls[i];
    image.onload = function () {
        faceImages[i] = image;
        imagesLoaded++;

        if (imagesLoaded === faceUrls.length) {
        cubeMap.uploadImages(faceImages);
        }
    };
    }
    gl.enable(gl.DEPTH_TEST);

    draw(gl, shaderr, vertexConfig);
    window.dispatchEvent(new Event("resize"));
});
