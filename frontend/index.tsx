import { h, render } from "preact";
import { useState } from "preact/hooks";
import * as bg from "@bgord/frontend";

type MilisecondType = number;

const HoursInput = { default: 0, min: 0, max: 23, placeholder: "00" };
const MinutesInput = { default: 0, min: 0, max: 59, placeholder: "00" };
const SecondsInput = { default: 0, min: 0, max: 59, placeholder: "00" };

function addLeadingZero(value: number) {
  return String(value).padStart(2, "0");
}

enum TimerStatusEnum {
  idle = "idle",
  working = "working",
}

type TimerPayloadType = {
  hours: bg.Hours;
  minutes: bg.Minutes;
  seconds: bg.Seconds;
  scheduledAtTimestamp: number;
  durationInMs: MilisecondType;
};

function App() {
  const [timerStatus, setTimerStatus] = useState<TimerStatusEnum>(
    TimerStatusEnum.idle
  );
  const [_, setTimerPayload] = useState<TimerPayloadType | null>(null);

  const timestamp = bg.useCurrentTimestamp();

  const hours = bg.useField<bg.Hours>(new bg.Hours(0));
  const minutes = bg.useField<bg.Minutes>(new bg.Minutes(0));
  const seconds = bg.useField<bg.Seconds>(new bg.Seconds(0));

  const durationInMs: MilisecondType =
    hours.value.toMs() + minutes.value.toMs() + seconds.value.toMs();

  const finishDate = new Date(timestamp + durationInMs);

  const finishHourFormatted = String(finishDate.getHours()).padStart(2, "0");
  const finishMinuteFormatted = String(finishDate.getMinutes()).padStart(
    2,
    "0"
  );
  const finishSecondFormatted = String(finishDate.getSeconds()).padStart(
    2,
    "0"
  );

  const finishTime = `${finishHourFormatted}:${finishMinuteFormatted}:${finishSecondFormatted}`;

  function clear() {
    hours.clear();
    minutes.clear();
    seconds.clear();
  }

  return (
    <main data-display="flex" data-direction="column">
      {timerStatus === TimerStatusEnum.idle && (
        <form
          data-display="flex"
          data-direction="column"
          data-gap="48"
          data-mt="72"
          data-mx="auto"
          data-max-width="768"
          onSubmit={(event) => {
            event.preventDefault();

            const payload = {
              hours: hours.value,
              minutes: minutes.value,
              seconds: seconds.value,
              scheduledAtTimestamp: timestamp,
              durationInMs,
            };

            setTimerStatus(TimerStatusEnum.working);
            setTimerPayload(payload);
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
                value={addLeadingZero(hours.value.value)}
                onInput={(event) =>
                  hours.set(new bg.Hours(event.currentTarget.valueAsNumber))
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
                value={addLeadingZero(minutes.value.value)}
                onInput={(event) =>
                  minutes.set(new bg.Minutes(event.currentTarget.valueAsNumber))
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
                value={addLeadingZero(seconds.value.value)}
                onInput={(event) =>
                  seconds.set(new bg.Seconds(event.currentTarget.valueAsNumber))
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
              onClick={clear}
            >
              Clear
            </button>
          </div>

          {durationInMs > 0 && <div>The timer will end at {finishTime}</div>}
        </form>
      )}
    </main>
  );
}

render(<App />, document.querySelector("#root") as Element);
