import {
  HeartFillIcon,
  HeartIcon,
  LinkIcon,
  PencilIcon,
} from "@primer/octicons-react";
import { useMemo, useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Form } from "components/Form";
import { Input, InputVariant } from "components/Input";
import { Modal } from "components/Modal";
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
import { RetailerByHostName, RetailerLabel } from "lib/retailer";

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

  const [editStoreLinkModalOpen, setEditStoreLinkModalOpen] = useState(false);

  const { toggleFavoriteRetailerLink, updateRetailerLink } =
    useRetailerLinkMutations();

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

  const toggleFavorite = async () => {
    await toggleFavoriteRetailerLink({
      componentType,
      componentId,
      linkId: link.id,
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
        <Button onClick={toggleFavorite} variant={ButtonVariant.INLINE}>
          {link.isFavorite && <HeartFillIcon size={24} />}
          {!link.isFavorite && <HeartIcon size={24} />}
        </Button>
        <Button
          onClick={() => setEditStoreLinkModalOpen(true)}
          variant={ButtonVariant.INLINE}
        >
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

      {editStoreLinkModalOpen && (
        <Modal>
          <h2 className={classNames.editLinkModalTitle}>Edit Store Link</h2>
          <Form
            initialData={
              link as Pick<RetailerProductLinkSchema, "url" | "retailerName">
            }
            schema={[
              {
                dataType: "text",
                name: "url",
                label: "Product Listing URL",
              },
              {
                dataType: "text",
                name: "retailerName",
                label: "Store Name",
              },
            ]}
            onCancel={() => setEditStoreLinkModalOpen(false)}
            onInputBlur={(fieldName, value, setField) => {
              if (fieldName !== "url") {
                return;
              }

              if (!value || typeof value !== "string") {
                return;
              }

              try {
                const url = new URL(value);
                const retailer = RetailerByHostName[url.hostname];

                if (retailer) {
                  setField("retailerName", RetailerLabel[retailer]);
                } else {
                  // If we don't recognize the retailer, just use the hostname
                  setField("retailerName", url.hostname);
                }
              } catch (e) {
                return;
              }
            }}
            onSubmit={async (data) => {
              if (!data.url || !data.retailerName) {
                // TODO visual form validation errors
                return;
              }

              await updateRetailerLink({
                componentType,
                componentId,
                id: link.id,
                changes: {
                  retailerName: data.retailerName,
                  url: data.url,
                },
              });

              setEditStoreLinkModalOpen(false);
            }}
          />
        </Modal>
      )}
    </Div.LinkContainer>
  );
};
