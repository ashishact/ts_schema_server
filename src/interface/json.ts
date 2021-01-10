import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable'
import { foldMap, mapLeft } from 'fp-ts/lib/Either'
import { reporter } from "io-ts-reporters";

function optional<RT extends t.Any>(
    type: RT,
    name: string = `${type.name} | undefined`
): t.UnionType<
    [RT, t.UndefinedType],
    t.TypeOf<RT> | undefined,
    t.OutputOf<RT> | undefined,
    t.InputOf<RT> | undefined
> {
    return t.union<[RT, t.UndefinedType]>([type, t.undefined], name);
}

export async function decode<T, O, I>(
    validator: t.Type<T, O, I>,
    input: I | string,
): Promise<[string | null, T | null]> {
    if (typeof (input) === "string") {
        try { input = JSON.parse(input) }
        catch (e) { return ["JSON parsing error", null] };
        // input = await Promise.resolve(JSON.parse(input)).catch(e=>error=e);
    }
    const result = validator.decode(input as I);
    if (result._tag === "Left") {
        const error = reporter(result).join(", ");
        return [error, null];
    }

    return [null, result.right];
}


// Restruicted Array
// https://stackoverflow.com/questions/57429769/how-to-validate-array-length-with-io-ts
/*
interface IMinMaxArray<T> extends Array<T> {
    readonly minMaxArray: unique symbol
}
export const minMaxArray = <C extends t.Mixed>(min: number, max: number, a: C) => t.brand(
    t.array(a),
    (n: Array<C>): n is t.Branded<Array<C>, IMinMaxArray<C>> => min < n.length && n.length < max,
    'minMaxArray'
);
*/


export enum STATUS {
    success = "success",
    fail = "fail"
}

export enum ERROR_CODES {
    NONE,
    EMPTY_PARAMS,
    INVALID_PARAMS,
    NOT_IMPLEMENTED,
    TILE_SERVER_ERROR,
    ID_NOT_FOUND,
}

export const idC = t.type({ id: t.string });
export const LocationC = t.type({ lat: t.number, lng: t.number });
// export const CoordinateC = minMaxArray(2, 2, t.number);
export const CoordinateC = t.tuple([t.number, t.number]);
export const GeofenceC = t.type({
    id: t.string,
    name: t.string,
    shape: t.union([t.literal("circle"), t.literal("polygon")]),
    center: LocationC,
    radius: t.number,
    path: optional(t.array(LocationC)),
    address: optional(t.string),
});
export const GeofencesC = t.array(GeofenceC);
export const GeofencesAddC = t.type({ id: t.string, name: optional(t.string), geofences: GeofencesC });
export const GeofenceRemoveC = t.type({id: t.string, ids: t.array(t.string)});

export const AssetC = t.type({
    id: t.string,
    name: optional(t.string),
    location: LocationC,
});
export const AssetsC = t.array(AssetC);
export const AssetsAddC = t.type({id: t.string, name: optional(t.string), assets: AssetsC});
export const AssetsRemoveC = t.type({id: t.string, ids: t.array(t.string)});

export const AssignC = t.type({
    assetGroupId: t.string,
    geofenceGroupId: t.string,
});
export const SetAssetLocationC = t.type({
    assetGroupId: t.string,
    assetId: t.string,
    location: LocationC,
    timeout: optional(t.number)
})



export type AssetI = t.TypeOf<typeof AssetC>;
export type GeofenceI = t.TypeOf<typeof GeofenceC>;



export const GEN_FAIL = (error: Error|Error[]|string|null, errorCode: ERROR_CODES) => {
    return { status: STATUS.fail, message: error, errorCode: errorCode }
}
export const GEN_SUCCESS = (data: any[]) => {
    return { status: STATUS.success, data: data };
}
export default {};

