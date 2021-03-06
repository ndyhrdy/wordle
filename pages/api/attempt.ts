// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { lowerCase } from "lodash";
import moment from "moment";
import wordsList from "../../data/words.json";

type Response = AttemptResponse | ErrorResponse;

const getWordOfTheDay = async (): Promise<string> => {
  try {
    const firstWordDate = process.env.FIRST_WORD_DATE;
    const daysPastSinceFirstWord = moment().diff(moment(firstWordDate), "days");
    if (!wordsList[daysPastSinceFirstWord]) {
      throw new Error("No word defined for today");
    }
    return wordsList[daysPastSinceFirstWord];
  } catch (error) {
    throw new Error("Failed to get word of the day: " + error);
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Response>) => {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }
  const { word } = req.query;
  if (
    typeof word !== "string" ||
    word.length !== 5 ||
    !wordsList.includes(word)
  ) {
    res.status(422).json({ message: "Submitted word is invalid" });
    return;
  }
  const wordOfTheDay = await getWordOfTheDay();
  const letters: AttemptLetter[] = [];
  word.split("").forEach((letter, index) => {
    const getLetterResult = (): LetterResult => {
      if (lowerCase(wordOfTheDay[index]) === lowerCase(letter)) {
        return "GREEN";
      }
      if (lowerCase(wordOfTheDay).includes(lowerCase(letter))) {
        return "YELLOW";
      }
      return "BLACK";
    };
    const result: LetterResult = getLetterResult();
    letters.push({
      char: letter,
      result,
    });
  });
  res.status(200).json({ letters });
};

export default handler;
