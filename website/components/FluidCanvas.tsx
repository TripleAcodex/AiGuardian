"use client";

import { useEffect, useRef } from "react";

export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const config = {
      TEXTURE_DOWNSAMPLE: 1,
      DENSITY_DISSIPATION: 0.98,
      VELOCITY_DISSIPATION: 0.99,
      PRESSURE_DISSIPATION: 0.8,
      PRESSURE_ITERATIONS: 25,
      CURL: 30,
      SPLAT_RADIUS: 0.004,
    };

    interface Pointer {
      id: number;
      x: number;
      y: number;
      dx: number;
      dy: number;
      down: boolean;
      moved: boolean;
      color: number[];
    }

    const pointers: Pointer[] = [];
    const splatStack: number[] = [];

    function newPointer(): Pointer {
      return { id: -1, x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false, color: [30, 0, 300] };
    }

    pointers.push(newPointer());

    const params = { alpha: false, depth: false, stencil: false, antialias: false };
    let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
    const isWebGL2 = !!gl;
    if (!gl) gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext;

    if (!gl) return;

    const _gl = gl;

    let halfFloat: { HALF_FLOAT_OES: number } | null = null;
    let supportLinearFiltering: unknown;
    if (isWebGL2) {
      _gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = _gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = _gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = _gl.getExtension("OES_texture_half_float_linear");
    }

    _gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? _gl.HALF_FLOAT : halfFloat!.HALF_FLOAT_OES;

    function getSupportedFormat(
      gl: WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number
    ): { internalFormat: number; format: number } | null {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
          case gl.R16F:
            return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
          case gl.RG16F:
            return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
          default:
            return null;
        }
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(
      gl: WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number
    ) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    let formatRGBA: { internalFormat: number; format: number } | null;
    let formatRG: { internalFormat: number; format: number } | null;
    let formatR: { internalFormat: number; format: number } | null;

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(_gl, _gl.RGBA16F, _gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(_gl, _gl.RG16F, _gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(_gl, _gl.R16F, _gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(_gl, _gl.RGBA, _gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(_gl, _gl.RGBA, _gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(_gl, _gl.RGBA, _gl.RGBA, halfFloatTexType);
    }

    function compileShader(type: number, source: string) {
      const shader = _gl.createShader(type)!;
      _gl.shaderSource(shader, source);
      _gl.compileShader(shader);
      if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS))
        throw _gl.getShaderInfoLog(shader);
      return shader;
    }

    class GLProgram {
      program: WebGLProgram;
      uniforms: Record<string, WebGLUniformLocation | null>;
      constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        this.uniforms = {};
        this.program = _gl.createProgram()!;
        _gl.attachShader(this.program, vertexShader);
        _gl.attachShader(this.program, fragmentShader);
        _gl.linkProgram(this.program);
        if (!_gl.getProgramParameter(this.program, _gl.LINK_STATUS))
          throw _gl.getProgramInfoLog(this.program);
        const uniformCount = _gl.getProgramParameter(this.program, _gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
          const uniformName = _gl.getActiveUniform(this.program, i)!.name;
          this.uniforms[uniformName] = _gl.getUniformLocation(this.program, uniformName);
        }
      }
      bind() {
        _gl.useProgram(this.program);
      }
    }

    const baseVertexShader = compileShader(
      _gl.VERTEX_SHADER,
      `precision highp float;precision mediump sampler2D;attribute vec2 aPosition;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 texelSize;void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);gl_Position=vec4(aPosition,0.0,1.0);}`
    );
    const clearShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`
    );
    const displayShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}`
    );
    const splatShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}`
    );
    const advectionManualFilteringShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 texelSize;uniform float dt;uniform float dissipation;vec4 bilerp(in sampler2D sam,in vec2 p){vec4 st;st.xy=floor(p-0.5)+0.5;st.zw=st.xy+1.0;vec4 uv=st*texelSize.xyxy;vec4 a=texture2D(sam,uv.xy);vec4 b=texture2D(sam,uv.zy);vec4 c=texture2D(sam,uv.xw);vec4 d=texture2D(sam,uv.zw);vec2 f=p-st.xy;return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}void main(){vec2 coord=gl_FragCoord.xy-dt*texture2D(uVelocity,vUv).xy;gl_FragColor=dissipation*bilerp(uSource,coord);gl_FragColor.a=1.0;}`
    );
    const advectionShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 texelSize;uniform float dt;uniform float dissipation;void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=dissipation*texture2D(uSource,coord);gl_FragColor.a=1.0;}`
    );
    const divergenceShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;vec2 sampleVelocity(in vec2 uv){vec2 multiplier=vec2(1.0,1.0);if(uv.x<0.0){uv.x=0.0;multiplier.x=-1.0;}if(uv.x>1.0){uv.x=1.0;multiplier.x=-1.0;}if(uv.y<0.0){uv.y=0.0;multiplier.y=-1.0;}if(uv.y>1.0){uv.y=1.0;multiplier.y=-1.0;}return multiplier*texture2D(uVelocity,uv).xy;}void main(){float L=sampleVelocity(vL).x;float R=sampleVelocity(vR).x;float T=sampleVelocity(vT).y;float B=sampleVelocity(vB).y;float div=0.5*(R-L+T-B);gl_FragColor=vec4(div,0.0,0.0,1.0);}`
    );
    const curlShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;float vorticity=R-L-T+B;gl_FragColor=vec4(vorticity,0.0,0.0,1.0);}`
    );
    const vorticityShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;uniform float curl;uniform float dt;void main(){float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;vec2 force=vec2(abs(T)-abs(B),0.0);force*=1.0/length(force+0.00001)*curl*C;vec2 vel=texture2D(uVelocity,vUv).xy;gl_FragColor=vec4(vel+force*dt,0.0,1.0);}`
    );
    const pressureShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;vec2 boundary(in vec2 uv){return min(max(uv,0.0),1.0);}void main(){float L=texture2D(uPressure,boundary(vL)).x;float R=texture2D(uPressure,boundary(vR)).x;float T=texture2D(uPressure,boundary(vT)).x;float B=texture2D(uPressure,boundary(vB)).x;float divergence=texture2D(uDivergence,vUv).x;float pressure=(L+R+B+T-divergence)*0.25;gl_FragColor=vec4(pressure,0.0,0.0,1.0);}`
    );
    const gradientSubtractShader = compileShader(
      _gl.FRAGMENT_SHADER,
      `precision highp float;precision mediump sampler2D;varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;vec2 boundary(in vec2 uv){return min(max(uv,0.0),1.0);}void main(){float L=texture2D(uPressure,boundary(vL)).x;float R=texture2D(uPressure,boundary(vR)).x;float T=texture2D(uPressure,boundary(vT)).x;float B=texture2D(uPressure,boundary(vB)).x;vec2 velocity=texture2D(uVelocity,vUv).xy;velocity.xy-=vec2(R-L,T-B);gl_FragColor=vec4(velocity,0.0,1.0);}`
    );

    type FBO = [WebGLTexture, WebGLFramebuffer, number];
    interface DoubleFBO {
      read: FBO;
      write: FBO;
      swap: () => void;
    }

    let textureWidth: number, textureHeight: number;
    let density: DoubleFBO, velocity: DoubleFBO;
    let divergenceFBO: FBO, curlFBO: FBO, pressure: DoubleFBO;

    function initFramebuffers() {
      textureWidth = _gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
      textureHeight = _gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;
      const texType = halfFloatTexType;
      const rgba = formatRGBA!;
      const rg = formatRG!;
      const r = formatR!;
      density = createDoubleFBO(2, textureWidth, textureHeight, rgba.internalFormat, rgba.format, texType, supportLinearFiltering ? _gl.LINEAR : _gl.NEAREST);
      velocity = createDoubleFBO(0, textureWidth, textureHeight, rg.internalFormat, rg.format, texType, supportLinearFiltering ? _gl.LINEAR : _gl.NEAREST);
      divergenceFBO = createFBO(4, textureWidth, textureHeight, r.internalFormat, r.format, texType, _gl.NEAREST);
      curlFBO = createFBO(5, textureWidth, textureHeight, r.internalFormat, r.format, texType, _gl.NEAREST);
      pressure = createDoubleFBO(6, textureWidth, textureHeight, r.internalFormat, r.format, texType, _gl.NEAREST);
    }

    function createFBO(texId: number, w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
      _gl.activeTexture(_gl.TEXTURE0 + texId);
      const texture = _gl.createTexture()!;
      _gl.bindTexture(_gl.TEXTURE_2D, texture);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, param);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, param);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
      _gl.texImage2D(_gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = _gl.createFramebuffer()!;
      _gl.bindFramebuffer(_gl.FRAMEBUFFER, fbo);
      _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, texture, 0);
      _gl.viewport(0, 0, w, h);
      _gl.clear(_gl.COLOR_BUFFER_BIT);
      return [texture, fbo, texId];
    }

    function createDoubleFBO(texId: number, w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
      let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);
      return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { const temp = fbo1; fbo1 = fbo2; fbo2 = temp; },
      };
    }

    initFramebuffers();

    const clearProgram = new GLProgram(baseVertexShader, clearShader);
    const displayProgram = new GLProgram(baseVertexShader, displayShader);
    const splatProgram = new GLProgram(baseVertexShader, splatShader);
    const advectionProgram = new GLProgram(baseVertexShader, supportLinearFiltering ? advectionShader : advectionManualFilteringShader);
    const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
    const curlProgram = new GLProgram(baseVertexShader, curlShader);
    const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
    const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
    const gradientSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

    const blit = (() => {
      _gl.bindBuffer(_gl.ARRAY_BUFFER, _gl.createBuffer());
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), _gl.STATIC_DRAW);
      _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _gl.createBuffer());
      _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), _gl.STATIC_DRAW);
      _gl.vertexAttribPointer(0, 2, _gl.FLOAT, false, 0, 0);
      _gl.enableVertexAttribArray(0);
      return (destination: WebGLFramebuffer | null) => {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, destination);
        _gl.drawElements(_gl.TRIANGLES, 6, _gl.UNSIGNED_SHORT, 0);
      };
    })();

    function splat(x: number, y: number, dx: number, dy: number, color: number[]) {
      splatProgram.bind();
      _gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2]);
      _gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas!.width / canvas!.height);
      _gl.uniform2f(splatProgram.uniforms.point, x / canvas!.width, 1.0 - y / canvas!.height);
      _gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
      _gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS);
      blit(velocity.write[1]);
      velocity.swap();
      _gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
      _gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
      blit(density.write[1]);
      density.swap();
    }

    function multipleSplats(amount: number) {
      for (let i = 0; i < amount; i++) {
        const color = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
        const x = canvas!.width * Math.random();
        const y = canvas!.height * Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
      }
    }

    let lastTime = Date.now();
    let animId: number;
    let destroyed = false;

    multipleSplats(Math.floor(Math.random() * 20) + 5);

    // Auto-splat every few seconds for ambient motion
    const autoSplatInterval = setInterval(() => {
      if (!destroyed) multipleSplats(Math.floor(Math.random() * 3) + 1);
    }, 3000);

    function update() {
      if (destroyed) return;
      resizeCanvas();
      const dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
      lastTime = Date.now();

      _gl.viewport(0, 0, textureWidth, textureHeight);
      if (splatStack.length > 0) multipleSplats(splatStack.pop()!);

      advectionProgram.bind();
      _gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
      _gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2]);
      _gl.uniform1f(advectionProgram.uniforms.dt, dt);
      _gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write[1]);
      velocity.swap();

      _gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
      _gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
      _gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(density.write[1]);
      density.swap();

      for (const pointer of pointers) {
        if (pointer.moved) {
          splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
          pointer.moved = false;
        }
      }

      curlProgram.bind();
      _gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2]);
      blit(curlFBO[1]);

      vorticityProgram.bind();
      _gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2]);
      _gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFBO[2]);
      _gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      _gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write[1]);
      velocity.swap();

      divergenceProgram.bind();
      _gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2]);
      blit(divergenceFBO[1]);

      clearProgram.bind();
      let pressureTexId = pressure.read[2];
      _gl.activeTexture(_gl.TEXTURE0 + pressureTexId);
      _gl.bindTexture(_gl.TEXTURE_2D, pressure.read[0]);
      _gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
      _gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
      blit(pressure.write[1]);
      pressure.swap();

      pressureProgram.bind();
      _gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(pressureProgram.uniforms.uDivergence, divergenceFBO[2]);
      pressureTexId = pressure.read[2];
      _gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId);
      _gl.activeTexture(_gl.TEXTURE0 + pressureTexId);
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        _gl.bindTexture(_gl.TEXTURE_2D, pressure.read[0]);
        blit(pressure.write[1]);
        pressure.swap();
      }

      gradientSubtractProgram.bind();
      _gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
      _gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read[2]);
      _gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read[2]);
      blit(velocity.write[1]);
      velocity.swap();

      _gl.viewport(0, 0, _gl.drawingBufferWidth, _gl.drawingBufferHeight);
      displayProgram.bind();
      _gl.uniform1i(displayProgram.uniforms.uTexture, density.read[2]);
      blit(null);

      animId = requestAnimationFrame(update);
    }

    function resizeCanvas() {
      if (canvas!.width !== canvas!.clientWidth || canvas!.height !== canvas!.clientHeight) {
        canvas!.width = canvas!.clientWidth;
        canvas!.height = canvas!.clientHeight;
        initFramebuffers();
      }
    }

    // Mouse events
    const onMouseMove = (e: MouseEvent) => {
      pointers[0].moved = pointers[0].down;
      pointers[0].dx = (e.offsetX - pointers[0].x) * 10.0;
      pointers[0].dy = (e.offsetY - pointers[0].y) * 10.0;
      pointers[0].x = e.offsetX;
      pointers[0].y = e.offsetY;
    };
    const onMouseOver = () => {
      pointers[0].down = true;
      pointers[0].color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
    };
    const onMouseLeave = () => {
      pointers[0].down = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        if (i >= pointers.length) pointers.push(newPointer());
        pointers[i].id = touches[i].identifier;
        pointers[i].down = true;
        pointers[i].x = touches[i].pageX;
        pointers[i].y = touches[i].pageY;
        pointers[i].color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = pointers[i];
        if (!pointer) continue;
        pointer.moved = pointer.down;
        pointer.dx = (touches[i].pageX - pointer.x) * 10.0;
        pointer.dy = (touches[i].pageY - pointer.y) * 10.0;
        pointer.x = touches[i].pageX;
        pointer.y = touches[i].pageY;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++)
        for (let j = 0; j < pointers.length; j++)
          if (touches[i].identifier === pointers[j].id)
            pointers[j].down = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseover", onMouseOver);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    update();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      clearInterval(autoSplatInterval);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseover", onMouseOver);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.55 }}
    />
  );
}
