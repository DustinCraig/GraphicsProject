

export class Mesh {
    constructor(gl) {
        this.gl = gl 
    }

    create_vao(name, indices, vertices, normals, uv) {

        this.indices = indices
        this.vertices = vertices 
        this.normals = normals 
        this.uv = uv 

        let vao = this.gl.ext.createVertexArrayOES()
        this.gl.ext.bindVertexArrayOES(vao)

        /* Set up mesh */

        /* Handle vertices */
        if(vertices !== null && name != 'skybox') {
            this.vertex_buffer = this.gl.createBuffer()
            this.vertex_count = vertices.length / 3
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vertex_buffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW)
            this.gl.enableVertexAttribArray(0)
            this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0)
        }

        if(name == 'skybox') {
            this.vertex_buffer = this.gl.createBuffer()
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW)
            this.gl.enableVertexAttribArray(0)
            this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0)
        }

        /* Handle normals */
        if(normals !== null) {
            this.normal_buffer = this.gl.createBuffer()
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normal_buffer)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW)
            this.gl.enableVertexAttribArray(1)
            this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0)
        }

        // /* Handle UVs */
        if(name === 'dirt') {
            const texture_coordinates = [
                0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1
            ]
            this.uv_buffer = this.gl.createBuffer()
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uv_buffer)
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texture_coordinates), this.gl.STATIC_DRAW)
                this.gl.enableVertexAttribArray(2)
                this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 0, 0)
        }  
        else {
            if(uv !== null) {
                this.uv_buffer = this.gl.createBuffer()
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uv_buffer)
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW)
                this.gl.enableVertexAttribArray(2)
                this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 0, 0)
            }
        }

        /* Handle mesh indices */
        if(indices !== null) {
            this.index_buffer = this.gl.createBuffer()
            this.index_count = indices.length 
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.index_buffer)
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW)
        }
        /*************/

        /**Clean Up***/
        this.gl.ext.bindVertexArrayOES(null)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
        /*************/

        return vao
    }
}