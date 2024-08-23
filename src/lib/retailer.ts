import { Region, Retailer } from "lib/constants";

export const RetailerLabel = {
  [Retailer.AMAZON]: "Amazon",
  [Retailer.BESTBUY]: "Best Buy",
  [Retailer.BHPHOTO]: "B&H Photo Video",
  [Retailer.NEWEGG]: "Newegg",
};

/**
 * Groups retailer hostnames by region and retailer.
 */
export const RetailerHostNamesByRegion = {
  [Region.US]: {
    [Retailer.AMAZON]: ["www.amazon.com", "a.co"],
    [Retailer.BESTBUY]: ["www.bestbuy.com"],
    [Retailer.BHPHOTO]: ["www.bhphotovideo.com"],
    [Retailer.NEWEGG]: ["www.newegg.com"],
  },
  [Region.CA]: {
    [Retailer.AMAZON]: ["www.amazon.ca"],
    [Retailer.BESTBUY]: ["www.bestbuy.ca"],
    [Retailer.BHPHOTO]: ["www.bhphotovideo.com"],
    [Retailer.NEWEGG]: ["www.newegg.ca"],
  },
  [Region.UK]: {
    [Retailer.AMAZON]: ["www.amazon.co.uk"],
    [Retailer.BESTBUY]: ["www.bestbuy.com"],
    [Retailer.BHPHOTO]: ["www.bhphotovideo.com"],
    [Retailer.NEWEGG]: ["www.newegg.com"],
  },
  [Region.AU]: {
    [Retailer.AMAZON]: ["www.amazon.com.au"],
    [Retailer.BESTBUY]: ["www.bestbuy.com"],
    [Retailer.BHPHOTO]: ["www.bhphotovideo.com"],
    [Retailer.NEWEGG]: ["www.newegg.com"],
  },
};

/**
 * Maps hostname to a corresponding retailer.
 */
export const RetailerByHostName = Object.values(
  RetailerHostNamesByRegion
).reduce((acc, hostNamesByRetailer) => {
  return Object.entries(hostNamesByRetailer).reduce(
    (acc, [retailer, hostNames]) => {
      hostNames.forEach((hostName) => {
        acc[hostName] = retailer as Retailer;
      });
      return acc;
    },
    acc
  );
}, {} as Record<string, Retailer>);
