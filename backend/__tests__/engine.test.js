const Engine = require("../src/engine");

describe("engine", () => {
  test("countdown ticks to zero and stops", () => {
    let s = { time: 2, running: true, type: "countdown" };
    s = Engine.tick(s); // 1
    s = Engine.tick(s); // 0, running false
    expect(s.time).toBe(0);
    expect(s.running).toBe(false);
  });

  test("countup increments when running", () => {
    let s = { time: 5, running: true, type: "countup" };
    s = Engine.tick(s);
    expect(s.time).toBe(6);
  });

  test("setTime & setMode work", () => {
    let s = Engine.createInitialState();
    s = Engine.setTime(s, 123);
    s = Engine.setMode(s, "countup");
    expect(s.time).toBe(123);
    expect(s.type).toBe("countup");
  });

  test("start accepts payload", () => {
    let s = Engine.createInitialState();
    s = Engine.start(s, { time: 10, type: "countdown" });
    expect(s.running).toBe(true);
    expect(s.time).toBe(10);
  });
});