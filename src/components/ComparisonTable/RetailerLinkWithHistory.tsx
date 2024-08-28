import { HeartIcon, LinkIcon, PencilIcon } from "@primer/octicons-react";
import { useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Input, InputVariant } from "components/Input";
import { RetailerProductLinkSchema } from "lib/db";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./RetailerLinkWithHistory.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

function formatDayOfMonth(ts: number) {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDayOfWeek(ts: number) {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function formatScaledPrice(price: number) {
  return parseFloat(`${price}e-2`).toFixed(2).toString();
}

interface RetailerLinkWithHistoryProps {
  link: RetailerProductLinkSchema;
}

export const RetailerLinkWithHistory = (
  props: RetailerLinkWithHistoryProps
) => {
  const { link } = props;

  const [priceHistory, setPriceHistory] = useState(() => {
    const now = new Date();

    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const sortedHistory = link.priceHistory.sort((a, b) => b.date - a.date);

    const defaultToday = {
      price: 0,
      date: todayMidnight.getTime(),
    };

    if (sortedHistory[0]?.date === todayMidnight.getTime()) {
      return sortedHistory;
    }

    return [defaultToday, ...sortedHistory];
  });

  const updatePrice = async (price: number) => {
    setPriceHistory((prev) => {
      return [
        {
          ...prev[0],
          price,
        },
        ...prev.slice(1),
      ];
    });
  };

  const renderPrice = (price: number, prevPrice: number | undefined) => {
    const formattedPrice = `$ ${formatScaledPrice(price)}`;

    if (prevPrice === undefined || price === prevPrice) {
      return (
        <Span.PriceChangeNeutral>{formattedPrice}</Span.PriceChangeNeutral>
      );
    }

    if (price > prevPrice) {
      return (
        <Span.PriceChangeNegative>{formattedPrice}</Span.PriceChangeNegative>
      );
    }
    if (price < prevPrice) {
      return (
        <Span.PriceChangePositive>{formattedPrice}</Span.PriceChangePositive>
      );
    }
  };

  // Won't always hold a valid number, acts as uncommitted state for the price input
  const [currentPrice, setCurrentPrice] = useState(
    formatScaledPrice(priceHistory[0].price)
  );

  return (
    <Div.LinkContainer>
      <Div.LinkHeading key={link.id}>
        <h2>{link.retailerName}</h2>
        <Button
          className={classNames.copyLinkButton}
          onClick={async () => {
            await navigator.clipboard.writeText(link.url);
          }}
          variant={ButtonVariant.INLINE}
        >
          <LinkIcon /> Copy
        </Button>
        <Button onClick={() => {}} variant={ButtonVariant.INLINE}>
          <HeartIcon size={24} />
        </Button>
        <Button onClick={() => {}} variant={ButtonVariant.INLINE}>
          <PencilIcon size={24} />
        </Button>
      </Div.LinkHeading>
      <Div.LinkHistoryContainer>
        {priceHistory.map((history, i) => (
          <Div.LinkHistory key={history.date}>
            <h3>{formatDayOfMonth(history.date)}</h3>
            {i === 0 && (
              <>
                <span>Today</span>
                <Input
                  className={classNames.priceInput}
                  labelText="$"
                  type="number"
                  name="price"
                  onBlur={async () => {
                    let scaledValue = parseFloat(`${currentPrice}e2`);
                    if (isNaN(scaledValue) || scaledValue < 0) {
                      scaledValue = 0;
                    }

                    await updatePrice(scaledValue);

                    setCurrentPrice(formatScaledPrice(scaledValue));
                  }}
                  onChange={(e) => {
                    setCurrentPrice(e.target.value);
                  }}
                  value={currentPrice}
                  variant={InputVariant.INLINE}
                />
              </>
            )}
            {i > 0 && (
              <>
                <span>{formatDayOfWeek(history.date)}</span>
                {renderPrice(history.price, priceHistory[i + 1]?.price)}
              </>
            )}
          </Div.LinkHistory>
        ))}
      </Div.LinkHistoryContainer>
    </Div.LinkContainer>
  );
};
