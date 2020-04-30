### COSC 452 - Computer Graphics 
## Final Project
For my final project, I decided to make an atmospheric scene. You are a lonely islander that has nothing but 2 candles, a cabin with no door, a boat with two paddles, 
and a desk with no chair. 
## Details
Look around by focusing on the screen and moving the mouse around.
To navigate the world use the WASD keys.
## Checklist
### Objects
Pier, Cabin, Desk, Desk Candle, Boat, Boat Candle, Dirt X2, Grass, Skybox, Water
### Shaders
Object shader(basic shader used for objects without a normal map), Object shader_nm(used for objects with an attached normal map), dirt/grass shader(same as object but only interacts with ambient light), skybox shader(used to render the skybox), ocean shader(used to render the ocean)
### Effects
Water dUdV map simulated waves, realtime water reflectance, skybox, realtime fog, diffuse/ambient lighting on nearly every object with multiple light sources.

The cabin and the boat have bump maps on them and the light interacts with them. 
