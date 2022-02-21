"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginateRawAndEntities = exports.paginateRaw = exports.paginate = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("./interfaces");
const create_pagination_1 = require("./create-pagination");
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
function paginate(repositoryOrQueryBuilder, options, searchOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        return repositoryOrQueryBuilder instanceof typeorm_1.Repository
            ? paginateRepository(repositoryOrQueryBuilder, options, searchOptions)
            : paginateQueryBuilder(repositoryOrQueryBuilder, options);
    });
}
exports.paginate = paginate;
function paginateRaw(queryBuilder, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [page, limit, route, paginationType, countQueries] = resolveOptions(options);
        const promises = [
            (paginationType === interfaces_1.PaginationTypeEnum.LIMIT_AND_OFFSET
                ? queryBuilder.limit(limit).offset((page - 1) * limit)
                : queryBuilder.take(limit).skip((page - 1) * limit)).getRawMany(),
            undefined,
        ];
        if (countQueries) {
            promises[1] = countQuery(queryBuilder);
        }
        const [items, total] = yield Promise.all(promises);
        return (0, create_pagination_1.createPaginationObject)({
            items,
            totalItems: total,
            currentPage: page,
            limit,
            route,
            metaTransformer: options.metaTransformer,
            routingLabels: options.routingLabels,
        });
    });
}
exports.paginateRaw = paginateRaw;
function paginateRawAndEntities(queryBuilder, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [page, limit, route, paginationType, countQueries] = resolveOptions(options);
        const promises = [
            (paginationType === interfaces_1.PaginationTypeEnum.LIMIT_AND_OFFSET
                ? queryBuilder.limit(limit).offset((page - 1) * limit)
                : queryBuilder.take(limit).skip((page - 1) * limit)).getRawAndEntities(),
            undefined,
        ];
        if (countQueries) {
            promises[1] = countQuery(queryBuilder);
        }
        const [itemObject, total] = yield Promise.all(promises);
        return [
            (0, create_pagination_1.createPaginationObject)({
                items: itemObject.entities,
                totalItems: total,
                currentPage: page,
                limit,
                route,
                metaTransformer: options.metaTransformer,
                routingLabels: options.routingLabels,
            }),
            itemObject.raw,
        ];
    });
}
exports.paginateRawAndEntities = paginateRawAndEntities;
function resolveOptions(options) {
    const page = resolveNumericOption(options, 'page', DEFAULT_PAGE);
    const limit = resolveNumericOption(options, 'limit', DEFAULT_LIMIT);
    const route = options.route;
    const paginationType = options.paginationType || interfaces_1.PaginationTypeEnum.LIMIT_AND_OFFSET;
    const countQueries = typeof options.countQueries !== 'undefined' ? options.countQueries : true;
    return [page, limit, route, paginationType, countQueries];
}
function resolveNumericOption(options, key, defaultValue) {
    const value = options[key];
    const resolvedValue = Number(value);
    if (Number.isInteger(resolvedValue) && resolvedValue >= 0)
        return resolvedValue;
    console.warn(`Query parameter "${key}" with value "${value}" was resolved as "${resolvedValue}", please validate your query input! Falling back to default "${defaultValue}".`);
    return defaultValue;
}
const normalizeSearchOptions = (searchOptions) => {
    if (searchOptions && typeof searchOptions === 'object' && ('where' in searchOptions || 'order' in searchOptions)) {
        return searchOptions;
    }
    else {
        return { where: searchOptions };
    }
};
function paginateRepository(repository, options, searchOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const [page, limit, route, paginationType, countQueries] = resolveOptions(options);
        if (page < 1) {
            return (0, create_pagination_1.createPaginationObject)({
                items: [],
                totalItems: 0,
                currentPage: page,
                limit,
                route,
                metaTransformer: options.metaTransformer,
                routingLabels: options.routingLabels,
            });
        }
        const normalizedOpts = normalizeSearchOptions(searchOptions);
        const promises = [
            repository.find(Object.assign({ skip: limit * (page - 1), take: limit }, normalizedOpts)),
            undefined,
        ];
        if (countQueries) {
            promises[1] = repository.count(normalizedOpts.where);
        }
        const [items, total] = yield Promise.all(promises);
        return (0, create_pagination_1.createPaginationObject)({
            items,
            totalItems: total,
            currentPage: page,
            limit,
            route,
            metaTransformer: options.metaTransformer,
            routingLabels: options.routingLabels,
        });
    });
}
function paginateQueryBuilder(queryBuilder, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [page, limit, route, paginationType, countQueries] = resolveOptions(options);
        const promises = [
            (interfaces_1.PaginationTypeEnum.LIMIT_AND_OFFSET === paginationType
                ? queryBuilder.limit(limit).offset((page - 1) * limit)
                : queryBuilder.take(limit).skip((page - 1) * limit)).getMany(),
            undefined,
        ];
        if (countQueries) {
            promises[1] = countQuery(queryBuilder);
        }
        const [items, total] = yield Promise.all(promises);
        return (0, create_pagination_1.createPaginationObject)({
            items,
            totalItems: total,
            currentPage: page,
            limit,
            route,
            metaTransformer: options.metaTransformer,
            routingLabels: options.routingLabels,
        });
    });
}
const countQuery = (queryBuilder) => __awaiter(void 0, void 0, void 0, function* () {
    const totalQueryBuilder = queryBuilder.clone();
    totalQueryBuilder
        .skip(undefined)
        .limit(undefined)
        .offset(undefined)
        .take(undefined);
    const { value } = yield queryBuilder.connection
        .createQueryBuilder()
        .select('COUNT(*)', 'value')
        .from(`(${totalQueryBuilder.getQuery()})`, 'uniqueTableAlias')
        .setParameters(queryBuilder.getParameters())
        .getRawOne();
    return Number(value);
});
