import { lowerCase, times } from "lodash";
import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import Head from "next/head";
import type { NextPage } from "next";
import {
  appendAttemptResult,
  attemptToString,
  generateLetterHistoryFromAttemptResult,
} from "../helpers/attempts";
import { hasWon } from "../helpers/game";
import { MAX_ATTEMPTS } from "../config";
import Keyboard from "../components/Keyboard";
import LetterBlock from "../components/LetterBlock";
import WinModal from "../components/WinModal";

const Home: NextPage = () => {
  const [attempts, setAttempts] = useState<Attempt[]>(
    times(MAX_ATTEMPTS, () => ({
      letters: [],
    }))
  );
  const [currentAttemptIndex, setCurrentAttemptIndex] = useState(0);
  const [dismissedWinModal, setDismissedWinModal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [letterHistory, setLetterHistory] = useState<LetterHistory[]>([]);

  const gameStatus: GameStatus = useMemo(() => {
    if (isBusy) {
      return "BUSY";
    }
    if (hasWon(attempts)) {
      return "WON";
    }
    if (currentAttemptIndex + 1 > MAX_ATTEMPTS) {
      return "LOST";
    }
    return "PLAYING";
  }, [isBusy, attempts, currentAttemptIndex]);

  const handleSubmitAttempt = useCallback(async () => {
    if (gameStatus !== "PLAYING") {
      return;
    }
    setIsBusy(true);
    const currentAttempt = attempts[currentAttemptIndex];
    try {
      if (currentAttempt.letters.length < 5) {
        throw new Error("incorrect-word-length");
      }
      const { data: attemptResult } = await axios.get<AttemptResponse>(
        "/api/attempt",
        {
          params: {
            word: attemptToString(currentAttempt),
          },
        }
      );
      setAttempts(
        appendAttemptResult(attempts, currentAttemptIndex, attemptResult)
      );
      setTimeout(() => {
        setCurrentAttemptIndex(currentAttemptIndex + 1);
        setLetterHistory(
          generateLetterHistoryFromAttemptResult(
            letterHistory,
            attemptResult.letters
          )
        );
        setIsBusy(false);
      }, 5 * 500);
    } catch (error) {
      alert(error);
    }
  }, [attempts, currentAttemptIndex, gameStatus, letterHistory]);

  const handleKeyboardChange = useCallback(
    (newText: string) => {
      if (newText.length > 5 || gameStatus !== "PLAYING") {
        return;
      }
      setAttempts(
        attempts.map((attempt, index) => {
          if (index !== currentAttemptIndex) {
            return attempt;
          }
          return {
            letters: newText
              .split("")
              .map((newTextChar) => ({ char: lowerCase(newTextChar) })),
          };
        })
      );
    },
    [gameStatus, currentAttemptIndex, attempts]
  );

  return (
    <div>
      <Head>
        <title>Endy&apos;s Wordle</title>
        <meta
          name="description"
          content="Daily word-guessing game remake by Endy, inspired by the original Wordle game."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="bg-slate-50 min-h-screen flex flex-col">
        <div className="container px-8 mx-auto bg-white max-w-lg shadow-lg flex-1 flex flex-col justify-center">
          <div className="py-8 h-full flex flex-col space-y-2">
            {attempts.map((attempt, index) => {
              return (
                <div
                  className="flex space-x-2 justify-center"
                  key={`attempt-${index}`}
                >
                  {times(5, (charIndex) => {
                    const letter = attempt.letters[charIndex];
                    return (
                      <LetterBlock
                        key={`attempt-${index}-${charIndex}`}
                        letter={letter}
                        sequence={charIndex}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <Keyboard
          text={attemptToString(attempts[currentAttemptIndex])}
          letterHistory={letterHistory}
          onChange={handleKeyboardChange}
          onSubmit={handleSubmitAttempt}
        />
      </main>
      <WinModal
        attempts={attempts}
        gameStatus={gameStatus}
        visible={["WON", "LOST"].includes(gameStatus) && !dismissedWinModal}
        onDismiss={() => {
          setDismissedWinModal(true);
        }}
      />
    </div>
  );
};

export default Home;
