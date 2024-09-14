import { HeartIcon, LinkIcon, PencilIcon } from "@primer/octicons-react";
import { useMemo, useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Input, InputVariant } from "components/Input";
import { useRetailerLinkMutations } from "hooks/useRetailerLinks";
import { BuildComponentStoreName } from "lib/build";
import { RetailerProductLinkSchema } from "lib/db";
import {
  formatDayOfMonth,
  formatDayOfWeek,
  formatScaledPrice,
} from "lib/format";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./RetailerLinkWithHistory.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

interface RetailerLinkWithHistoryProps {
  componentType: BuildComponentStoreName;
  componentId: number;
  link: RetailerProductLinkSchema;
}

export const RetailerLinkWithHistory = (
  props: RetailerLinkWithHistoryProps
) => {
  const { componentType, componentId, link } = props;

  const { updateRetailerLink } = useRetailerLinkMutations();

  const priceHistory = useMemo(() => {
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
  }, [link.priceHistory]);

  const updatePrice = async (price: number) => {
    await updateRetailerLink({
      componentType,
      componentId,
      id: link.id,
      changes: {
        priceHistory: [
          {
            ...priceHistory[0],
            price,
          },
          ...priceHistory.slice(1),
        ],
      },
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

  const commitCurrentPrice = async () => {
    let scaledValue = parseFloat(`${currentPrice}e2`);
    if (isNaN(scaledValue) || scaledValue < 0) {
      scaledValue = 0;
    }

    await updatePrice(scaledValue);

    setCurrentPrice(formatScaledPrice(scaledValue));
  };

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
                <form
                  noValidate // don't show built-in validation popups
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await commitCurrentPrice();
                  }}
                >
                  <Input
                    className={classNames.priceInput}
                    labelText="$"
                    type="number"
                    name="price"
                    onBlur={commitCurrentPrice}
                    onChange={(e) => {
                      setCurrentPrice(e.target.value);
                    }}
                    value={currentPrice}
                    variant={InputVariant.INLINE}
                  />
                </form>
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
