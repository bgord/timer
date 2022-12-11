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
  finished = "finished",
}

type Context = {
  hours: bg.Hours;
  minutes: bg.Minutes;
  seconds: bg.Seconds;
  durationInMs: MilisecondType;
  scheduledAtTimestamp: MilisecondType | null;
};
type Events =
  | { type: "START"; scheduledAtTimestamp: MilisecondType }
  | { type: "CLEAR" }
  | { type: "UPDATE_HOURS"; value: bg.Hours["value"] }
  | { type: "UPDATE_MINUTES"; value: bg.Minutes["value"] }
  | { type: "UPDATE_SECONDS"; value: bg.Seconds["value"] }
  | { type: "TICK" };

const timerMachine = createMachine<Context, Events>(
  {
    id: "timer",
    initial: "idle",
    context: {
      hours: new bg.Hours(HoursInput.default),
      minutes: new bg.Minutes(MinutesInput.default),
      seconds: new bg.Seconds(SecondsInput.default),
      durationInMs: 0,
      scheduledAtTimestamp: null,
    },
    states: {
      idle: {
        on: {
          START: {
            cond: "isTimeNotEmpty",
            target: "working",
            actions: [
              assign((_, event) => ({
                scheduledAtTimestamp: event.scheduledAtTimestamp,
              })),
              "playSound",
            ],
          },

          CLEAR: { target: "idle", actions: "clearTimer" },

          UPDATE_HOURS: {
            target: "idle",
            actions: [
              assign((_, event) => ({
                hours: new bg.Hours(valueExtractor(event.value, HoursInput)),
              })),
              "updateDurationInMs",
            ],
          },

          UPDATE_MINUTES: {
            target: "idle",
            actions: [
              assign((_, event) => ({
                minutes: new bg.Minutes(
                  valueExtractor(event.value, MinutesInput)
                ),
              })),
              "updateDurationInMs",
            ],
          },

          UPDATE_SECONDS: {
            target: "idle",
            actions: [
              assign((_, event) => ({
                seconds: new bg.Seconds(
                  valueExtractor(event.value, SecondsInput)
                ),
              })),
              "updateDurationInMs",
            ],
          },
        },
      },

      working: {
        invoke: { src: "tick" },
        on: { TICK: { target: "working", actions: "decreaseTime" } },
        always: [{ target: "finished", cond: "hasTimeElapsed" }],
      },

      finished: { onEntry: "playSound" },
    },
  },
  {
    actions: {
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
    },

    services: {
      tick: () => (schedule) => {
        const interval = setInterval(() => schedule("TICK"), 1000);
        return () => clearInterval(interval);
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
  const timestamp = bg.useCurrentTimestamp();

  const [state, send] = useMachine(timerMachine);
  const estimatedFinishTime = bg.DateFormatter.clock(
    timestamp + state.context.durationInMs
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
            send({ type: "START", scheduledAtTimestamp: timestamp });
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
                id="minutes"
                name="minutes"
                class="c-input"
                placeholder={MinutesInput.placeholder}
                type="number"
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
            <div>The timer will end at {estimatedFinishTime}</div>
          )}
        </form>
      )}

      {state.value === TimerStatusEnum.working && (
        <div>{state.context.durationInMs}</div>
      )}

      {state.value === TimerStatusEnum.finished && <div>finished</div>}
    </main>
  );
}

function valueExtractor(
  value: number,
  input: typeof HoursInput | typeof MinutesInput | typeof SecondsInput
) {
  if (isNaN(value)) return input.min;

  if (value > input.max) return input.max;

  return value;
}

render(<App />, document.querySelector("#root") as Element);
