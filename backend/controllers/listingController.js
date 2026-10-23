const Listing = require("../models/Listing");

// GET /api/listings?category=&city=&search=&minPrice=&maxPrice=&sort=&page=&limit=
exports.getListings = async (req, res) => {
  try {
    const {
      category,
      city,
      search,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (category) filter.category = category.toLowerCase();
    if (city) filter.city = new RegExp(city, "i");
    if (search) filter.title = new RegExp(search, "i");

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    let sortBy = { createdAt: -1 };
    if (sort === "price_asc") sortBy = { basePrice: 1 };
    if (sort === "price_desc") sortBy = { basePrice: -1 };
    if (sort === "rating") sortBy = { rating: -1 };

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    const total = await Listing.countDocuments(filter);
    const listings = await Listing.find(filter)
      .sort(sortBy)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      listings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/listings/:id
exports.getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(listing);
  } catch (error) {
    res.status(400).json({ message: "Invalid listing id" });
  }
};

// POST /api/listings  (admin only)
exports.createListing = async (req, res) => {
  try {
    const listing = await Listing.create({ ...req.body, owner: req.user._id });
    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/listings/:id  (admin only)
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(listing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/listings/:id  (admin only)
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndDelete(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ message: "Listing deleted" });
  } catch (error) {
    res.status(400).json({ message: "Invalid listing id" });
  }
};