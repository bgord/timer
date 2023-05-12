import { h, render } from "preact";
import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";
import * as bg from "@bgord/frontend";

type MilisecondType = number;

const HoursInput = { default: 0, min: 0, max: 23, placeholder: "00" };
const MinutesInput = { default: 0, min: 0, max: 59, placeholder: "00" };
const SecondsInput = { default: 0, min: 0, max: 59, placeholder: "00" };

enum TimerStatusEnum {
  idle = "idle",
  working = "working",
  stopped = "stopped",
  finished = "finished",
}

type Context = {
  hours: bg.Hours;
  minutes: bg.Minutes;
  seconds: bg.Seconds;
  durationInMs: MilisecondType;
};
type Events =
  | { type: "START" }
  | { type: "CLEAR" }
  | { type: "STOP" }
  | { type: "RESTART" }
  | { type: "CONTINUE" }
  | { type: "UPDATE_HOURS"; value: bg.Hours["value"] }
  | { type: "UPDATE_MINUTES"; value: bg.Minutes["value"] }
  | { type: "UPDATE_SECONDS"; value: bg.Seconds["value"] }
  | { type: "TICK" };

const timerMachine = createMachine<Context, Events>(
  {
    id: "timer",
    initial: "idle",
    context: {
      hours: new bg.Hours(
        localStorage.getItem("hours")
          ? Number(localStorage.getItem("hours"))
          : HoursInput.default
      ),
      minutes: new bg.Minutes(
        localStorage.getItem("minutes")
          ? Number(localStorage.getItem("minutes"))
          : MinutesInput.default
      ),
      seconds: new bg.Seconds(
        localStorage.getItem("seconds")
          ? Number(localStorage.getItem("seconds"))
          : SecondsInput.default
      ),
      durationInMs: localStorage.getItem("durationInMs")
        ? Number(localStorage.getItem("durationInMs"))
        : 0,
    },
    states: {
      idle: {
        on: {
          START: {
            cond: "isTimeNotEmpty",
            target: "working",
            actions: "playSound",
          },

          CLEAR: {
            target: "idle",
            actions: ["cleanLocalStorage", "clearTimer"],
          },

          UPDATE_HOURS: {
            target: "idle",
            actions: ["updateHours", "updateDurationInMs"],
          },

          UPDATE_MINUTES: {
            target: "idle",
            actions: ["updateMinutes", "updateDurationInMs"],
          },

          UPDATE_SECONDS: {
            target: "idle",
            actions: ["updateSeconds", "updateDurationInMs"],
          },
        },
      },

      working: {
        invoke: { src: "tick" },
        entry: "syncToLocalStorage",
        on: {
          RESTART: {
            target: "working",
            actions: ["playSound", "updateDurationInMs"],
          },
          TICK: { target: "working", actions: "decreaseTime" },
          CLEAR: {
            target: "idle",
            actions: ["cleanLocalStorage", "clearTimer"],
          },
          STOP: "stopped",
        },
        always: { target: "finished", cond: "hasTimeElapsed" },
      },

      stopped: {
        on: {
          CONTINUE: "working",
          CLEAR: {
            target: "idle",
            actions: ["cleanLocalStorage", "clearTimer"],
          },
        },
      },

      finished: {
        entry: ["playSound", "cleanLocalStorage"],
        on: { CLEAR: { target: "idle", actions: "clearTimer" } },
      },
    },
  },
  {
    actions: {
      syncToLocalStorage: (context) => {
        localStorage.setItem("durationInMs", String(context.durationInMs));
        localStorage.setItem("hours", String(context.hours.value));
        localStorage.setItem("minutes", String(context.minutes.value));
        localStorage.setItem("seconds", String(context.seconds.value));
      },

      cleanLocalStorage: () => {
        localStorage.removeItem("durationInMs");
        localStorage.removeItem("hours");
        localStorage.removeItem("minutes");
        localStorage.removeItem("seconds");
      },

      playSound: () => new Audio("/static/sound.wav").play(),

      clearTimer: assign((_context, _event) => ({
        hours: new bg.Hours(HoursInput.default),
        minutes: new bg.Minutes(MinutesInput.default),
        seconds: new bg.Seconds(SecondsInput.default),
        durationInMs: 0,
      })),

      decreaseTime: assign((context) => ({
        durationInMs: context.durationInMs - 1000,
      })),

      updateDurationInMs: assign((context) => ({
        durationInMs:
          context.hours.toMs() +
          context.minutes.toMs() +
          context.seconds.toMs(),
      })),

      updateHours: assign((_, event) =>
        event.type === "UPDATE_HOURS"
          ? { hours: new bg.Hours(validator(event.value, HoursInput)) }
          : {}
      ),

      updateMinutes: assign((_, event) =>
        event.type === "UPDATE_MINUTES"
          ? { minutes: new bg.Minutes(validator(event.value, MinutesInput)) }
          : {}
      ),

      updateSeconds: assign((_, event) =>
        event.type === "UPDATE_SECONDS"
          ? { seconds: new bg.Seconds(validator(event.value, SecondsInput)) }
          : {}
      ),
    },

    services: {
      tick: () => (schedule) => {
        const interval = setInterval(() => schedule("TICK"), 1000);
        return () => clearInterval(interval);
      },

      syncToLocalStorage: (context) => {
        localStorage.setItem("durationInMs", String(context.durationInMs));
        localStorage.setItem("hours", String(context.hours.value));
        localStorage.setItem("minutes", String(context.minutes.value));
        localStorage.setItem("seconds", String(context.seconds.value));

        return () => {};
      },
    },

    guards: {
      hasTimeElapsed: (context) => context.durationInMs <= 0,

      isTimeNotEmpty: (context) =>
        context.hours.value > 0 ||
        context.minutes.value > 0 ||
        context.seconds.value > 0,
    },
  }
);

function App() {
  bg.useDisablePullToRefresh();

  const [state, send] = useMachine(timerMachine);
  const timestamp = bg.useCurrentTimestamp();

  const estimatedFinishTime = bg.DateFormatter.clockLocal(
    timestamp + state.context.durationInMs
  );

  bg.useDocumentTitle(
    [TimerStatusEnum.idle, TimerStatusEnum.finished].includes(
      state.value as TimerStatusEnum
    )
      ? "Timer"
      : bg.DateFormatter.clockUTC(state.context.durationInMs)
  );

  return (
    <main data-display="flex" data-direction="column">
      {state.value === TimerStatusEnum.idle && (
        <form
          data-display="flex"
          data-direction="column"
          data-gap="48"
          data-mt="72"
          data-mx="auto"
          data-max-width="768"
          onSubmit={(event) => {
            event.preventDefault();
            send({ type: "START" });
          }}
        >
          <div data-display="flex" data-cross="end" data-gap="12">
            <div data-display="flex" data-direction="column">
              <label class="c-label" htmlFor="hours">
                Hours
              </label>
              <input
                id="hours"
                name="hours"
                class="c-input"
                placeholder={HoursInput.placeholder}
                type="number"
                inputMode="numeric"
                required
                value={bg.DateFormatter._pad(state.context.hours.value)}
                onInput={(event) =>
                  send({
                    type: "UPDATE_HOURS",
                    value: event.currentTarget.valueAsNumber,
                  })
                }
                min={HoursInput.min}
                max={HoursInput.max}
                style={{ width: "72px" }}
              />
            </div>

            <div data-mb="6">:</div>

            <div data-display="flex" data-direction="column">
              <label class="c-label" htmlFor="minutes">
                Minutes
              </label>
              <input
                autofocus
                id="minutes"
                name="minutes"
                class="c-input"
                placeholder={MinutesInput.placeholder}
                type="number"
                inputMode="numeric"
                required
                value={bg.DateFormatter._pad(state.context.minutes.value)}
                onInput={(event) =>
                  send({
                    type: "UPDATE_MINUTES",
                    value: event.currentTarget.valueAsNumber,
                  })
                }
                min={MinutesInput.min}
                max={MinutesInput.max}
                style={{ width: "72px" }}
              />
            </div>

            <div data-mb="6">:</div>

            <div data-display="flex" data-direction="column">
              <label class="c-label" htmlFor="seconds">
                Seconds
              </label>
              <input
                id="seconds"
                name="seconds"
                class="c-input"
                placeholder={SecondsInput.placeholder}
                type="number"
                inputMode="numeric"
                required
                value={bg.DateFormatter._pad(state.context.seconds.value)}
                onInput={(event) =>
                  send({
                    type: "UPDATE_SECONDS",
                    value: event.currentTarget.valueAsNumber,
                  })
                }
                min={SecondsInput.min}
                max={SecondsInput.max}
                style={{ width: "72px" }}
              />
            </div>
          </div>

          <div
            data-display="flex"
            data-main="center"
            data-gap="24"
            data-wrap="nowrap"
          >
            <button
              class="c-button"
              data-variant="primary"
              type="submit"
              data-width="100%"
            >
              Start
            </button>

            <button
              class="c-button"
              data-variant="bare"
              type="button"
              data-width="100%"
              onClick={() => send({ type: "CLEAR" })}
            >
              Clear
            </button>
          </div>

          {state.context.durationInMs > 0 && (
            <div data-transform="center">
              The timer will end at {estimatedFinishTime}
            </div>
          )}
        </form>
      )}

      {[TimerStatusEnum.working, TimerStatusEnum.stopped].includes(
        state.value as TimerStatusEnum
      ) && (
        <div
          data-display="flex"
          data-direction="column"
          data-cross="center"
          data-gap="36"
          data-m="72"
        >
          <div data-fs="36">
            {bg.DateFormatter.clockUTC(state.context.durationInMs)}
          </div>

          <div data-display="flex" data-gap="36">
            {state.value === TimerStatusEnum.working && (
              <button
                class="c-button"
                data-variant="secondary"
                type="button"
                onClick={() => send({ type: "STOP" })}
              >
                Stop
              </button>
            )}

            {state.value === TimerStatusEnum.working && (
              <button
                class="c-button"
                data-variant="secondary"
                type="button"
                onClick={() => send({ type: "RESTART" })}
              >
                Restart
              </button>
            )}

            {state.value === TimerStatusEnum.stopped && (
              <button
                class="c-button"
                data-variant="secondary"
                type="button"
                onClick={() => send({ type: "CONTINUE" })}
              >
                Continue
              </button>
            )}

            <button
              class="c-button"
              data-variant="bare"
              type="button"
              onClick={() => send({ type: "CLEAR" })}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {state.value === TimerStatusEnum.finished && (
        <div data-display="flex" data-main="center" data-gap="36" data-m="72">
          <div data-fs="36">Time is up!</div>

          <button
            class="c-button"
            data-variant="bare"
            type="button"
            data-width="100%"
            onClick={() => send({ type: "CLEAR" })}
          >
            Clear
          </button>
        </div>
      )}

      <div
        data-position="absolute"
        data-top="0"
        data-right="0"
        data-mr="6"
        data-fs="12"
        data-color="gray-500"
      >
        Cretaed in {new Date().getFullYear()}
      </div>
    </main>
  );
}

function validator(
  value: number,
  input: typeof HoursInput | typeof MinutesInput | typeof SecondsInput
) {
  if (isNaN(value)) return input.min;

  if (value > input.max) return input.max;

  return value;
}

render(<App />, document.querySelector("#root") as Element);
