import { LinkIcon } from "@primer/octicons-react";
import { useState } from "react";

import { Button, ButtonVariant } from "components/Button";
import { Form } from "components/Form";
import { Modal, ModalVariant } from "components/Modal";
import { useComponentMutations } from "hooks/useComponents";
import { useRetailerLinks } from "hooks/useRetailerLinks";
import { BuildComponentMeta, BuildComponentStoreName } from "lib/build";
import { RetailerProductLinkSchema, Schema } from "lib/db";
import { RetailerByHostName, RetailerLabel } from "lib/retailer";
import { makeClassNamePrimitives } from "lib/styles";

import classNames from "./ComparisonTable.module.css";

const { Div, Span } = makeClassNamePrimitives(classNames);

export interface PriceHistoryModalProps<T extends BuildComponentStoreName> {
  componentType: T;
  onClose: () => void;
  row: Schema<T>;
}

export const PriceHistoryModal = <T extends BuildComponentStoreName>(
  props: PriceHistoryModalProps<T>
) => {
  const { componentType, onClose, row } = props;

  const { addRetailerLinkToComponent } = useComponentMutations();

  const { retailerLinks, isPending } = useRetailerLinks(componentType, row.id);

  const [addStoreLinkModalOpen, setAddStoreLinkModalOpen] = useState(false);

  const { singularName: componentTypeSingularLabel } =
    BuildComponentMeta[componentType];

  const showPlaceholder = retailerLinks.length === 0 && !isPending;

  return (
    <>
      <Modal variant={ModalVariant.RIGHT_SIDE}>
        <Div.PriceModal>
          <Div.PriceModalHeadingContainer>
            <h2 className={classNames.priceModalHeading}>Price History</h2>
            <Button onClick={onClose} variant={ButtonVariant.DEFAULT}>
              Close
            </Button>
          </Div.PriceModalHeadingContainer>
          <h1>{row.name}</h1>
          <Button
            onClick={() => setAddStoreLinkModalOpen(true)}
            variant={ButtonVariant.ACCENT}
          >
            Add Store Link
          </Button>
          {showPlaceholder && (
            <p className={classNames.priceModalPlaceholder}>
              This {componentTypeSingularLabel} isn't linked to any current
              store listing. Add a link above to start tracking its price. Add
              multiple links to track the price of the same{" "}
              {componentTypeSingularLabel} across several retailers.
            </p>
          )}
          {retailerLinks.length > 0 &&
            retailerLinks.map((link) => (
              <Div.PriceModalRetailerHeading key={link.id}>
                <h2>{link.retailerName}</h2>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(link.url);
                  }}
                  variant={ButtonVariant.DEFAULT}
                >
                  <LinkIcon />
                  Copy
                </Button>
              </Div.PriceModalRetailerHeading>
            ))}
        </Div.PriceModal>
      </Modal>
      {addStoreLinkModalOpen && (
        <Modal>
          <h2 className={classNames.modalTitle}>Add Store Link</h2>
          <p className={classNames.modalDescription}>
            Find a <strong>{row.name}</strong> listing you like on a retailer's
            website and paste the URL here.
          </p>
          <Form
            schema={[
              {
                dataType: "text",
                name: "link",
                label: "Product Listing URL",
              },
              {
                dataType: "text",
                name: "name",
                label: "Store Name",
              },
            ]}
            onCancel={() => setAddStoreLinkModalOpen(false)}
            onInputBlur={(fieldName, value, setField) => {
              if (fieldName !== "link") {
                return;
              }

              if (!value || typeof value !== "string") {
                return;
              }

              try {
                const url = new URL(value);
                const retailer = RetailerByHostName[url.hostname];

                if (retailer) {
                  setField("name", RetailerLabel[retailer]);
                } else {
                  // If we don't recognize the retailer, just use the hostname
                  setField("name", url.hostname);
                }
              } catch (e) {
                return;
              }
            }}
            onSubmit={async (data) => {
              if (!data.link || !data.name) {
                // TODO visual form validation errors
                return;
              }

              await addRetailerLinkToComponent({
                componentType,
                componentId: row.id,
                retailerName: data.name,
                url: data.link,
              });

              setAddStoreLinkModalOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
};
