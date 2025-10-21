import type { DocumentNode, FragmentDefinitionNode, InlineFragmentNode } from "graphql";
import { Observable } from "rxjs";
import type { GetDataState, OperationVariables, TypedDocumentNode } from "@apollo/client";
import type { FragmentType, Unmasked } from "@apollo/client/masking";
import type { Reference, StoreObject } from "@apollo/client/utilities";
import type { NoInfer } from "@apollo/client/utilities/internal";
import { getApolloCacheMemoryInternals } from "@apollo/client/utilities/internal";
import type { Cache } from "./types/Cache.js";
import type { MissingTree } from "./types/common.js";
export type Transaction = (c: ApolloCache) => void;
export declare namespace ApolloCache {
    /**
     * Watched fragment options.
     */
    interface WatchFragmentOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> {
        /**
         * A GraphQL fragment document parsed into an AST with the `gql`
         * template literal.
         *
         * @docGroup 1. Required options
         */
        fragment: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
         * An object containing a `__typename` and primary key fields
         * (such as `id`) identifying the entity object from which the fragment will
         * be retrieved, or a `{ __ref: "..." }` reference, or a `string` ID
         * (uncommon).
         *
         * @docGroup 1. Required options
         */
        from: StoreObject | Reference | FragmentType<NoInfer<TData>> | string;
        /**
         * Any variables that the GraphQL fragment may depend on.
         *
         * @docGroup 2. Cache options
         */
        variables?: TVariables;
        /**
         * The name of the fragment defined in the fragment document.
         *
         * Required if the fragment document includes more than one fragment,
         * optional otherwise.
         *
         * @docGroup 2. Cache options
         */
        fragmentName?: string;
        /**
         * If `true`, `watchFragment` returns optimistic results.
         *
         * The default value is `true`.
         *
         * @docGroup 2. Cache options
         */
        optimistic?: boolean;
    }
    /**
     * Watched fragment results.
     */
    type WatchFragmentResult<TData = unknown> = ({
        complete: true;
        missing?: never;
    } & GetDataState<TData, "complete">) | ({
        complete: false;
        missing: MissingTree;
    } & GetDataState<TData, "partial">);
}
export declare abstract class ApolloCache {
    readonly assumeImmutableResults: boolean;
    abstract read<TData = unknown, TVariables extends OperationVariables = OperationVariables>(query: Cache.ReadOptions<TData, TVariables>): Unmasked<TData> | null;
    abstract write<TData = unknown, TVariables extends OperationVariables = OperationVariables>(write: Cache.WriteOptions<TData, TVariables>): Reference | undefined;
    /**
     * Returns data read from the cache for a given query along with information
     * about the cache result such as whether the result is complete and details
     * about missing fields.
     *
     * Will return `complete` as `true` if it can fulfill the full cache result or
     * `false` if not. When no data can be fulfilled from the cache, `null` is
     * returned. When `returnPartialData` is `true`, non-null partial results are
     * returned if it contains at least one field that can be fulfilled from the
     * cache.
     */
    abstract diff<TData = unknown, TVariables extends OperationVariables = OperationVariables>(query: Cache.DiffOptions<TData, TVariables>): Cache.DiffResult<TData>;
    abstract watch<TData = unknown, TVariables extends OperationVariables = OperationVariables>(watch: Cache.WatchOptions<TData, TVariables>): () => void;
    abstract reset(options?: Cache.ResetOptions): Promise<void>;
    abstract evict(options: Cache.EvictOptions): boolean;
    /**
     * Replaces existing state in the cache (if any) with the values expressed by
     * `serializedState`.
     *
     * Called when hydrating a cache (server side rendering, or offline storage),
     * and also (potentially) during hot reloads.
     */
    abstract restore(serializedState: unknown): this;
    /**
     * Exposes the cache's complete state, in a serializable format for later restoration.
     */
    abstract extract(optimistic?: boolean): unknown;
    abstract removeOptimistic(id: string): void;
    abstract fragmentMatches(fragment: InlineFragmentNode | FragmentDefinitionNode, typename: string): boolean;
    lookupFragment(fragmentName: string): FragmentDefinitionNode | null;
    batch<U>(options: Cache.BatchOptions<this, U>): U;
    abstract performTransaction(transaction: Transaction, optimisticId?: string | null): void;
    recordOptimisticTransaction(transaction: Transaction, optimisticId: string): void;
    transformDocument(document: DocumentNode): DocumentNode;
    transformForLink(document: DocumentNode): DocumentNode;
    identify(object: StoreObject | Reference): string | undefined;
    gc(): string[];
    modify<Entity extends Record<string, any> = Record<string, any>>(options: Cache.ModifyOptions<Entity>): boolean;
    /**
     * Read data from the cache for the specified query.
     */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ query, variables, id, optimistic, returnPartialData, }: Cache.ReadQueryOptions<TData, TVariables>): Unmasked<TData> | null;
    /**
    * Read data from the cache for the specified query.
    */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.ReadQueryOptions<TData, TVariables>, 
    /**
     * @deprecated Pass the `optimistic` argument as part of the first argument
     * instead of passing it as a separate option.
     */
    optimistic: boolean): Unmasked<TData> | null;
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables>): Observable<ApolloCache.WatchFragmentResult<Unmasked<TData>>>;
    private getFragmentDoc;
    /**
     * Read data from the cache for the specified fragment.
     */
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ fragment, variables, fragmentName, id, optimistic, returnPartialData, }: Cache.ReadFragmentOptions<TData, TVariables>): Unmasked<TData> | null;
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.ReadFragmentOptions<TData, TVariables>, 
    /**
     * @deprecated Pass the `optimistic` argument as part of the first argument
     * instead of passing it as a separate option.
     */
    optimistic: boolean): Unmasked<TData> | null;
    /**
     * Writes data to the root of the cache using the specified query to validate that
     * the shape of the data you’re writing to the cache is the same as the shape of
     * the data required by the query. Great for prepping the cache with initial data.
     */
    writeQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ data, query, variables, overwrite, id, broadcast, }: Cache.WriteQueryOptions<TData, TVariables>): Reference | undefined;
    /**
     * Similar to `writeQuery` (writes data to the cache) but uses the specified
     * fragment to validate that the shape of the data you’re writing to the cache
     * is the same as the shape of the data required by the fragment.
     */
    writeFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ data, fragment, fragmentName, variables, overwrite, id, broadcast, }: Cache.WriteFragmentOptions<TData, TVariables>): Reference | undefined;
    updateQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.UpdateQueryOptions<TData, TVariables>, update: (data: Unmasked<TData> | null) => Unmasked<TData> | null | void): Unmasked<TData> | null;
    updateFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.UpdateFragmentOptions<TData, TVariables>, update: (data: Unmasked<TData> | null) => Unmasked<TData> | null | void): Unmasked<TData> | null;
    /**
    * @experimental
    * @internal
    * This is not a stable API - it is used in development builds to expose
    * information to the DevTools.
    * Use at your own risk!
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    getMemoryInternals?: typeof getApolloCacheMemoryInternals;
}
//# sourceMappingURL=cache.d.ts.map
