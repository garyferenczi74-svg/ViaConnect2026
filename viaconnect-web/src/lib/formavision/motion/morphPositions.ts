// Fixed-topology position-attribute interpolation for the FormaVision live morph
// (Prompt 210b, P2-T2b).
//
// The body geometry's topology (vertex count, index buffer, uv and barycentric
// layout) is invariant across param vectors: buildBodyGeometry sizes every buffer
// from the build options (radial and vertical segment counts), never from the
// measured numbers. So two different param vectors built with the same options
// yield position attributes of identical length, vertex for vertex in the same
// order. That lets the morph animate a single persistent geometry by lerping its
// position array each frame instead of rebuilding and disposing a BufferGeometry
// per frame.
//
// These helpers are pure array math with no three and no GPU, so the morph's
// correctness (the topology-invariance guard and the per-vertex lerp) is unit
// testable in the node runner.

// Guard the core invariant the position lerp relies on. A mismatch means the two
// states were built with different topology (different build options or a changed
// builder), which would make a vertexwise lerp meaningless, so this throws loudly
// rather than producing a silently scrambled body.
export function assertSameTopology(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
): void {
  if (from.length !== to.length) {
    throw new Error(
      `morph topology mismatch: from has ${from.length} position values, to has ${to.length}. ` +
        'Both states must be built with identical build options so the position-attribute lerp is valid.',
    );
  }
}

// Lerp every position component from -> to by t into the out buffer in place. out
// is the persistent geometry's position array, reused every frame so no allocation
// happens in the animation loop. Asserts equal lengths first.
export function lerpPositionsInto(
  out: Float32Array,
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  t: number,
): void {
  assertSameTopology(from, to);
  assertSameTopology(out, to);
  for (let i = 0; i < to.length; i += 1) {
    const a = from[i];
    out[i] = a + (to[i] - a) * t;
  }
}
