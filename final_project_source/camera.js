import {Transform} from './transform.js'

export class Camera {

    constructor(gl, fov, near, far, real_canvas) {
        this.canvas = gl.canvas 
        this.perspective_matrix = mat4.create()
        mat4.perspective(this.perspective_matrix,
            45,
            this.canvas.width/this.canvas.height,
            0.1,
            1000)
        this.modelview_matrix = mat4.create()
        this.transform = new Transform()
        //this.position = [0, 0, 0]
        document.addEventListener('keydown', event => {this.keydown(event)})
        document.addEventListener('keyup', event => {this.keyup(event)})
        document.addEventListener('mousemove', event => {this.mousemove(event)})

        this.pitch = 0 
        this.yaw = 0
        this.pitch_rate = 0
        this.yaw_rate = 0
        this.speed = 0.1
        this.xpos = 0
        this.ypos = 0
        this.zpos = 0 
        this.forward = false 
        this.backward = false 
        this.left = false 
        this.right = false 
    }

    update_viewmatrix() {
        this.modelview_matrix = mat4.create()
       
        if(this.forward) {
            this.xpos -= Math.sin(this.yaw) * this.speed 
            this.zpos -= Math.cos(this.yaw) * this.speed 
        } else if(this.backward) {
            this.xpos -= Math.sin(this.yaw) * -this.speed 
            this.zpos -= Math.cos(this.yaw) * -this.speed 
        }
        if(this.left) {
            this.xpos -= Math.cos(this.yaw) * this.speed
            this.zpos -= -Math.sin(this.yaw) * this.speed 
        }
        if(this.right) {
            this.xpos -= Math.cos(this.yaw) * -this.speed
            this.zpos -= -Math.sin(this.yaw) * -this.speed 
        }
        mat4.rotateX(this.modelview_matrix, this.modelview_matrix, -this.pitch)
        mat4.rotateY(this.modelview_matrix, this.modelview_matrix, -this.yaw)
        mat4.translate(this.modelview_matrix, this.modelview_matrix, [-this.xpos, -this.transform.position[1], -this.zpos])

      //  this.transform.position[1] += this.zpos
        // this.transform.position = [this.modelview_matrix[12], this.modelview_matrix[13], this.modelview_matrix[14]]
    }

    keydown(event) {

        if(event.keyCode === 87) 
            this.forward = true
        
        if(event.keyCode === 83) 
            this.backward = true
        
        if(event.keyCode === 65) 
            this.left = true
        if(event.keyCode === 68)
            this.right = true 
    }

    keyup(event) {
        if(event.keyCode === 65) 
            this.left = false 
        if(event.keyCode === 68)
            this.right = false 
        if(event.keyCode === 87)
            this.forward = false 
        if(event.keyCode === 83)
            this.backward = false       
    }

    mousemove(event) {
        this.pitch += -event.movementY *  0.003
        if(this.pitch > 89)
            this.pitch = 89
        if(this.pitch < -89)
            this.pitch = -89
        this.yaw += -event.movementX * 0.003
    }

}